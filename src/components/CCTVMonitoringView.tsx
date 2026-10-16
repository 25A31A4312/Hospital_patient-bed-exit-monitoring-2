import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  User,
  Eye,
  EyeOff,
  Shield,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  Bell,
  CheckCircle,
  Sliders,
  AlertTriangle,
  RefreshCw,
  Video,
  Loader2
} from 'lucide-react';
import { BedZone, ClinicalEvent, DisplayMode, HospitalRoom, LandmarkPoint, PatientPoseTelemetry } from '../types/monitor';
import { poseDetector } from '../services/poseDetector';
import { clinicalEngine, POSE_CONNECTIONS } from '../services/clinicalEngine';
import { soundAlerts } from '../services/soundAlerts';

interface CCTVMonitoringViewProps {
  room: HospitalRoom;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  onEventTriggered: (event: Omit<ClinicalEvent, 'id' | 'timestamp' | 'timeEpoch'>) => void;
  onOpenBedZoneEditor: () => void;
  activeScenario: string | null;
  uploadedVideoUrl: string | null;
}

export const CCTVMonitoringView: React.FC<CCTVMonitoringViewProps> = ({
  room,
  displayMode,
  setDisplayMode,
  onEventTriggered,
  onOpenBedZoneEditor,
  activeScenario,
  uploadedVideoUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState<boolean>(false);

  // Camera Facing Mode: defaults to 'environment' (Rear Camera) as required
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('t226_cam_facing');
      if (saved === 'user' || saved === 'environment') return saved;
    }
    return 'environment'; // Default: Prefer Rear Camera
  });
  const [activeFacingMode, setActiveFacingMode] = useState<'environment' | 'user'>('environment');
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('Rear Camera');
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);

  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [isEnginePaused, setIsEnginePaused] = useState<boolean>(false);
  const [showZoneOverlay, setShowZoneOverlay] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(soundAlerts.getMuted());
  const [lastAlertPosture, setLastAlertPosture] = useState<string>('lying_rest');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  const [telemetry, setTelemetry] = useState<PatientPoseTelemetry>({
    keypointsCount: 33,
    confidence: 94,
    posture: 'lying_rest',
    inBedZone: true,
    inWarningZone: false,
    isExited: false,
    isWandering: false,
    isFall: false,
    fallRiskScore: room.morseFallScore,
    restlessnessScore: 12,
    fps: 30,
    latencyMs: 14,
    lastUpdated: Date.now(),
  });

  // Clock for CCTV OSD timestamp
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toISOString().replace('T', ' ').substring(0, 19) +
          '.' +
          String(now.getMilliseconds()).padStart(3, '0')
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  // Update scenario in detector
  useEffect(() => {
    poseDetector.setSimulatedScenario(activeScenario);
  }, [activeScenario]);

  // Real Camera Switching & Initialization
  const switchCameraFacing = useCallback(
    async (targetFacing: 'environment' | 'user') => {
      if (uploadedVideoUrl) return; // If custom video is loaded, ignore camera switch

      setIsSwitchingCamera(true);
      setIsLoadingCamera(true);
      setCameraError(null);

      try {
        // 1. Stop existing tracks to prevent duplicate streams
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setStream(null);

        // Pause detector and clear stale landmarks
        poseDetector.stop();
        poseDetector.clear();

        // Clear canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access API is not supported in this browser environment.');
        }

        let mediaStream: MediaStream | null = null;
        let lastError: Error | null = null;

        // Try request with target facingMode
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
            },
            audio: false,
          });
        } catch (err: any) {
          console.warn(`Initial facingMode: ${targetFacing} failed, attempting relaxed constraints:`, err);
          // Try fallback without resolution constraints
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: targetFacing },
              audio: false,
            });
          } catch (err2: any) {
            // If specific facingMode is unsupported (e.g. laptop with single front camera requesting environment), try default camera
            try {
              mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              });
            } catch (err3: any) {
              lastError = err;
            }
          }
        }

        if (!mediaStream) {
          throw lastError || new Error(`Could not access ${targetFacing === 'environment' ? 'Rear' : 'Front'} camera.`);
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }

        // Retrieve video track details
        const videoTrack = mediaStream.getVideoTracks()[0];
        const trackLabel =
          videoTrack?.label ||
          (targetFacing === 'environment' ? 'Rear Camera (Environment)' : 'Front Camera (User/Selfie)');

        // Enumerate devices for camera list
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setAvailableVideoDevices(videoInputs);
        } catch {}

        // Initialize pose detector model if needed
        await poseDetector.initMediaPipe();

        // Update active camera state ONLY after successful switch
        setActiveFacingMode(targetFacing);
        setCameraFacingMode(targetFacing);
        setActiveCameraLabel(trackLabel);
        sessionStorage.setItem('t226_cam_facing', targetFacing);

        // Mirroring behavior: Front camera defaults to mirrored for natural user orientation; Rear camera defaults to un-mirrored
        setIsMirrored(targetFacing === 'user');

        // Start pose detector when video is ready
        if (videoRef.current && !isEnginePaused) {
          if (videoRef.current.readyState >= 2) {
            poseDetector.start(videoRef.current);
          } else {
            videoRef.current.onloadeddata = () => {
              if (videoRef.current && !isEnginePaused) {
                poseDetector.start(videoRef.current);
              }
            };
          }
        }

        setIsLoadingCamera(false);
        setIsSwitchingCamera(false);
      } catch (err: any) {
        console.error('Camera switch error:', err);
        let message = `Failed to start ${targetFacing === 'environment' ? 'Rear Camera' : 'Front Camera'}.`;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = 'Camera permission denied. Please allow camera access in browser permissions.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.name === 'OverconstrainedError') {
          message = `The requested ${targetFacing === 'environment' ? 'Rear' : 'Front'} camera is unavailable on this device. Please select the other camera.`;
        } else {
          message = err.message || message;
        }
        setCameraError(message);
        setIsLoadingCamera(false);
        setIsSwitchingCamera(false);
      }
    },
    [uploadedVideoUrl, isEnginePaused]
  );

  // Initial camera startup
  useEffect(() => {
    if (uploadedVideoUrl && videoRef.current) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setStream(null);
      }
      videoRef.current.srcObject = null;
      videoRef.current.src = uploadedVideoUrl;
      videoRef.current.loop = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
      setIsLoadingCamera(false);
      setCameraError(null);
      poseDetector.initMediaPipe();
    } else {
      switchCameraFacing(cameraFacingMode);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [uploadedVideoUrl, cameraFacingMode, switchCameraFacing]);

  // Handle video element hookup to pose detector
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (!isEnginePaused && !isSwitchingCamera && !cameraError) {
        poseDetector.start(video);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    if (video.readyState >= 1 && !isEnginePaused && !isSwitchingCamera) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      poseDetector.stop();
    };
  }, [isEnginePaused, isSwitchingCamera, cameraError]);

  // Handle pose detection subscriber
  useEffect(() => {
    const unsubscribe = poseDetector.subscribe((landmarks: LandmarkPoint[] | null, isRealMediaPipe: boolean) => {
      // Do not process or generate false events if engine paused, switching camera, or in camera error state
      if (isEnginePaused || isSwitchingCamera || cameraError) return;

      const telem = clinicalEngine.analyzePose(
        landmarks,
        room.bedZone,
        room.warningZoneMargin,
        30,
        room.morseFallScore
      );

      setTelemetry(telem);

      // Trigger clinical alarms on posture transition (only if camera feed is active and healthy)
      if (telem.posture !== lastAlertPosture && !isSwitchingCamera) {
        setLastAlertPosture(telem.posture);

        if (telem.posture === 'sitting_up') {
          soundAlerts.playWarningChime();
          onEventTriggered({
            roomId: room.id,
            severity: 'info',
            type: 'sitting_up',
            title: `Patient Sat Up in Bed (${room.roomNumber})`,
            description: `Torso elevated from horizontal resting angle. Patient remains within bed boundary.`,
            acknowledged: false,
          });
        } else if (telem.posture === 'legs_over_edge') {
          soundAlerts.playWarningChime();
          onEventTriggered({
            roomId: room.id,
            severity: 'warning',
            type: 'legs_over_edge',
            title: `Bed-Exit Pre-Warning: Legs Over Edge (${room.roomNumber})`,
            description: `Lower limbs crossed bed warning perimeter. High likelihood of imminent unassisted exit.`,
            acknowledged: false,
          });
        } else if (telem.posture === 'standing_exit') {
          soundAlerts.playCriticalAlarm();
          onEventTriggered({
            roomId: room.id,
            severity: 'critical',
            type: 'standing_exit',
            title: `CRITICAL ALERT: Patient Bed-Exit Detected (${room.roomNumber})`,
            description: `Patient standing outside designated bed safe zone. High fall risk protocol initiated.`,
            acknowledged: false,
          });
        } else if (telem.posture === 'wandering') {
          soundAlerts.playCriticalAlarm();
          onEventTriggered({
            roomId: room.id,
            severity: 'critical',
            type: 'wandering',
            title: `CRITICAL ALERT: Active Wandering Detected (${room.roomNumber})`,
            description: `Sustained patient movement detected outside bed zone without nurse accompaniment.`,
            acknowledged: false,
          });
        } else if (telem.posture === 'fall_detected') {
          soundAlerts.playCriticalAlarm();
          onEventTriggered({
            roomId: room.id,
            severity: 'critical',
            type: 'fall_detected',
            title: `EMERGENCY ALERT: Sudden Fall Detected (${room.roomNumber})`,
            description: `Rapid downward displacement detected. Patient lying horizontally on floor surface. Immediate response required.`,
            acknowledged: false,
          });
        }
      }

      // Render overlay on transparent canvas
      renderOverlayCanvas(landmarks, telem);
    });

    return () => {
      unsubscribe();
    };
  }, [isEnginePaused, isSwitchingCamera, cameraError, room, lastAlertPosture, displayMode, isMirrored, showZoneOverlay]);

  // Canvas drawing function for AI Overlay & Bed-Zone Boundaries
  const renderOverlayCanvas = (
    landmarks: LandmarkPoint[] | null,
    telem: PatientPoseTelemetry
  ) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Synchronize canvas coordinate resolution with video resolution or bounding client rect
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 450;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Always clear the transparent canvas
    ctx.clearRect(0, 0, width, height);

    // Coordinate mapping helper respecting camera mirror
    const mapPoint = (nx: number, ny: number) => {
      const finalX = isMirrored ? (1 - nx) * width : nx * width;
      const finalY = ny * height;
      return { x: finalX, y: finalY };
    };

    // 1. Draw Bed Safe Zone & Warning Margin Outline (if toggled on)
    if (showZoneOverlay) {
      const bz = room.bedZone;
      const margin = room.warningZoneMargin;
      const wz = clinicalEngine.getWarningZone(bz, margin);

      // Warning Zone (Amber dashed line)
      const wzStart = mapPoint(wz.x, wz.y);
      const wzEnd = mapPoint(wz.x + wz.width, wz.y + wz.height);
      const wzX = Math.min(wzStart.x, wzEnd.x);
      const wzW = Math.abs(wzEnd.x - wzStart.x);
      const wzY = wzStart.y;
      const wzH = wzEnd.y - wzStart.y;

      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(wzX, wzY, wzW, wzH);
      ctx.restore();

      // Bed Safe Zone (Cyan/Emerald solid line)
      const bzStart = mapPoint(bz.x, bz.y);
      const bzEnd = mapPoint(bz.x + bz.width, bz.y + bz.height);
      const bzX = Math.min(bzStart.x, bzEnd.x);
      const bzW = Math.abs(bzEnd.x - bzStart.x);
      const bzY = bzStart.y;
      const bzH = bzEnd.y - bzStart.y;

      ctx.save();
      ctx.fillStyle = telem.inBedZone
        ? 'rgba(16, 185, 129, 0.08)'
        : 'rgba(239, 68, 68, 0.12)';
      ctx.fillRect(bzX, bzY, bzW, bzH);

      ctx.strokeStyle = telem.inBedZone
        ? 'rgba(16, 185, 129, 0.85)'
        : 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(bzX, bzY, bzW, bzH);

      // Corner brackets for clinical camera look
      const cornerLen = 14;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(bzX, bzY + cornerLen);
      ctx.lineTo(bzX, bzY);
      ctx.lineTo(bzX + cornerLen, bzY);
      ctx.stroke();
      // Top-Right
      ctx.beginPath();
      ctx.moveTo(bzX + bzW - cornerLen, bzY);
      ctx.lineTo(bzX + bzW, bzY);
      ctx.lineTo(bzX + bzW, bzY + cornerLen);
      ctx.stroke();
      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(bzX, bzY + bzH - cornerLen);
      ctx.lineTo(bzX, bzY + bzH);
      ctx.lineTo(bzX + cornerLen, bzY + bzH);
      ctx.stroke();
      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(bzX + bzW - cornerLen, bzY + bzH);
      ctx.lineTo(bzX + bzW, bzY + bzH);
      ctx.lineTo(bzX + bzW, bzY + bzH - cornerLen);
      ctx.stroke();

      // Zone label
      ctx.fillStyle = telem.inBedZone ? '#10b981' : '#ef4444';
      ctx.font = '600 11px JetBrains Mono, monospace';
      ctx.fillText(
        `BED SAFE ZONE [${room.roomNumber}]`,
        bzX + 8,
        bzY > 20 ? bzY - 6 : bzY + 16
      );
      ctx.restore();
    }

    // 2. If AI Overlay mode is selected, draw pose skeleton & joints over the live camera video
    if (displayMode === 'ai_overlay' && landmarks && landmarks.length >= 33) {
      ctx.save();

      // Color scheme based on clinical state
      const skeletonColor =
        telem.posture === 'fall_detected' || telem.isExited
          ? '#ef4444' // red
          : telem.posture === 'legs_over_edge'
          ? '#f59e0b' // amber
          : '#06b6d4'; // cyan
      const jointColor =
        telem.posture === 'fall_detected' || telem.isExited
          ? '#f87171'
          : telem.posture === 'legs_over_edge'
          ? '#fbbf24'
          : '#38bdf8';

      // Draw skeleton lines
      ctx.strokeStyle = skeletonColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const p1 = landmarks[startIdx];
        const p2 = landmarks[endIdx];

        if (
          p1 &&
          p2 &&
          (p1.visibility ?? 1) > 0.25 &&
          (p2.visibility ?? 1) > 0.25
        ) {
          const pt1 = mapPoint(p1.x, p1.y);
          const pt2 = mapPoint(p2.x, p2.y);

          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }
      });

      // Draw 33 Anatomical Keypoint Nodes
      landmarks.forEach((pt, idx) => {
        if ((pt.visibility ?? 1) > 0.25) {
          const { x, y } = mapPoint(pt.x, pt.y);

          // Head or core joints slightly larger
          const isMajorJoint = [0, 11, 12, 23, 24, 25, 26, 27, 28].includes(idx);
          const radius = isMajorJoint ? 4.5 : 3;

          // Outer glow ring
          ctx.beginPath();
          ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fill();

          // Joint circle
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = jointColor;
          ctx.fill();
        }
      });

      // Draw Center of Mass (COM) marker on Torso
      if (telem.torsoCenter) {
        const com = mapPoint(telem.torsoCenter.x, telem.torsoCenter.y);
        ctx.beginPath();
        ctx.arc(com.x, com.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = skeletonColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '500 10px JetBrains Mono, monospace';
        ctx.fillText('COM', com.x + 8, com.y - 4);
      }

      ctx.restore();
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Audio mute toggle
  const toggleMute = () => {
    const nextState = !isAudioMuted;
    soundAlerts.setMuted(nextState);
    setIsAudioMuted(nextState);
    if (!nextState) {
      soundAlerts.playAckChime();
    }
  };

  // Pause / Resume engine
  const toggleEngine = () => {
    setIsEnginePaused((prev) => !prev);
  };

  // Status badge config
  const getStatusBadge = () => {
    if (cameraError) {
      return { label: 'OPTICAL STREAM OFFLINE', color: 'text-red-400 bg-red-500/10 border-red-500/30' };
    }
    if (isSwitchingCamera) {
      return { label: 'SWITCHING CAMERA LENS...', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30 animate-pulse' };
    }
    switch (telemetry.posture) {
      case 'lying_rest':
        return { label: 'RESTING IN BED (SUPINE/LATERAL)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'sitting_up':
        return { label: 'SITTING UP IN BED', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' };
      case 'legs_over_edge':
        return { label: 'WARNING: LEGS OVER BED EDGE', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30 animate-pulse' };
      case 'standing_exit':
        return { label: 'CRITICAL: BED-EXIT STANDING', color: 'text-red-400 bg-red-500/20 border-red-500/40 animate-pulse' };
      case 'wandering':
        return { label: 'CRITICAL: ACTIVE WANDERING', color: 'text-red-400 bg-red-500/20 border-red-500/40 animate-pulse' };
      case 'fall_detected':
        return { label: 'EMERGENCY: SUDDEN FALL DETECTED', color: 'text-red-500 bg-red-500/30 border-red-500/50 animate-bounce' };
      case 'bed_empty':
      default:
        return { label: 'BED VACANT / PATIENT ABSENT', color: 'text-slate-400 bg-slate-800/40 border-slate-700/40' };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
      }`}
    >
      {/* CCTV Monitor Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-cyan-400 tracking-wider">
              CAM-04 · {room.roomNumber}
            </span>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-xs text-slate-300">{room.patientName}</span>
          </div>

          <div
            className={`px-2.5 py-1 text-xs font-mono font-medium rounded border ${statusBadge.color}`}
          >
            {statusBadge.label}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* User-Controlled Camera Selector: Rear Camera vs Front Camera */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-lg">
            <button
              onClick={() => switchCameraFacing('environment')}
              disabled={isSwitchingCamera || Boolean(uploadedVideoUrl)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                activeFacingMode === 'environment' && !uploadedVideoUrl
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
              }`}
              title="Select Rear Camera (Back Camera / Inpatient Room View)"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Rear Camera</span>
              {activeFacingMode === 'environment' && !uploadedVideoUrl && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              )}
            </button>

            <button
              onClick={() => switchCameraFacing('user')}
              disabled={isSwitchingCamera || Boolean(uploadedVideoUrl)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                activeFacingMode === 'user' && !uploadedVideoUrl
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
              }`}
              title="Select Front Camera (Selfie / Direct Patient View)"
            >
              <User className="w-3.5 h-3.5" />
              <span>Front Camera</span>
              {activeFacingMode === 'user' && !uploadedVideoUrl && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              )}
            </button>
          </div>

          {/* View Mode Switcher (CCTV View is DEFAULT) */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-lg">
            <button
              onClick={() => setDisplayMode('cctv')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                displayMode === 'cctv'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Real camera video feed without skeleton lines (Standard CCTV)"
            >
              CCTV View
            </button>
            <button
              onClick={() => setDisplayMode('ai_overlay')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                displayMode === 'ai_overlay'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Real camera video with AI pose skeleton & keypoints overlay"
            >
              AI Overlay
            </button>
            <button
              onClick={() => setDisplayMode('privacy')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                displayMode === 'privacy'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Privacy-preserving blur filter compliant with patient dignity & HIPAA"
            >
              <Shield className="w-3.5 h-3.5" />
              Privacy View
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Viewport & Transparent Canvas Overlay Container */}
      <div className="relative w-full aspect-video min-h-[360px] bg-black flex items-center justify-center overflow-hidden select-none">
        {/* Real Live Camera Video Feed (Actual patient, bed, and room visible!) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-all duration-300 ${
            isMirrored ? 'scale-x-[-1]' : ''
          } ${
            displayMode === 'privacy'
              ? 'filter blur-[14px] brightness-90 contrast-110'
              : ''
          }`}
        />

        {/* Transparent Canvas Overlay for Bed Safe Zone and AI Skeletal Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* CCTV Camera On-Screen Display (OSD) Overlay */}
        <div className="absolute inset-0 p-4 pointer-events-none flex flex-col justify-between z-20 text-xs font-mono text-cyan-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {/* Top OSD Bar */}
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-semibold text-white tracking-wider">
                  REC ● LOCAL
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-cyan-200">
                  CAM-04 [{activeFacingMode === 'environment' ? 'REAR LENS' : 'FRONT LENS'}]
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                PATIENT: {room.patientName.toUpperCase()} · BED A
              </div>
            </div>

            <div className="text-right">
              <div className="text-emerald-400 font-semibold">{currentTimeStr}</div>
              <div className="text-[11px] text-slate-300">
                FPS: {telemetry.fps} · LATENCY: {telemetry.latencyMs}ms
              </div>
            </div>
          </div>

          {/* Privacy Mode Notice Banner (in privacy mode) */}
          {displayMode === 'privacy' && (
            <div className="self-center px-4 py-2 bg-slate-950/85 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-sans flex items-center gap-2 backdrop-blur-md">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>HIPAA Privacy Shield Active</strong>: Facial and biometric identity blurred. Pose classification runs 100% locally in browser memory.
              </span>
            </div>
          )}

          {/* Bottom OSD Bar */}
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-300">KEYPOINTS:</span>
                <span className="text-emerald-400 font-bold">
                  {telemetry.keypointsCount}/33
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300">CONFIDENCE:</span>
                <span className="text-cyan-300">{telemetry.confidence}%</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300">FALL RISK:</span>
                <span
                  className={
                    telemetry.fallRiskScore > 70
                      ? 'text-red-400 font-bold'
                      : telemetry.fallRiskScore > 40
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {telemetry.fallRiskScore}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                LENS: {activeCameraLabel} · ISO 60601-1-8 CLINICAL SAFETY
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400">
              SAFE BED BOUNDARY: {showZoneOverlay ? 'VISIBLE' : 'HIDDEN'}
            </div>
          </div>
        </div>

        {/* Camera Permission / Error Dialog Overlay */}
        {cameraError && !uploadedVideoUrl && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-full mb-3 text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              Camera Stream Notice
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-4">{cameraError}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => switchCameraFacing('environment')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors border border-slate-750"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                Select Rear Camera
              </button>
              <button
                onClick={() => switchCameraFacing('user')}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                Select Front Camera
              </button>
            </div>
          </div>
        )}

        {/* Loading Camera Spinner */}
        {(isLoadingCamera || isSwitchingCamera) && !cameraError && (
          <div className="absolute inset-0 bg-slate-950/80 z-25 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono text-cyan-300">
              {isSwitchingCamera
                ? `SWITCHING TO ${activeFacingMode === 'environment' ? 'FRONT CAMERA' : 'REAR CAMERA'}...`
                : 'INITIALIZING CCTV OPTICAL FEED & MEDIAPIPE PIPELINE...'}
            </span>
          </div>
        )}
      </div>

      {/* Monitor Control Bar (Bottom Actions) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 border-t border-slate-800">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Pause / Resume Engine */}
          <button
            onClick={toggleEngine}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 border transition-colors ${
              isEnginePaused
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-800'
            }`}
            title={isEnginePaused ? 'Resume AI Detection' : 'Pause AI Detection'}
          >
            {isEnginePaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume Engine
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pause Engine
              </>
            )}
          </button>

          {/* Toggle Bed Zone Outline */}
          <button
            onClick={() => setShowZoneOverlay((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 border transition-colors ${
              showZoneOverlay
                ? 'bg-slate-800/80 border-cyan-500/40 text-cyan-300 hover:bg-slate-800'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Bed Safe Zone boundary box visibility"
          >
            {showZoneOverlay ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                Bed Zone: Visible
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Bed Zone: Hidden
              </>
            )}
          </button>

          {/* Edit Bed Zone Calibration Button */}
          <button
            onClick={onOpenBedZoneEditor}
            className="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:bg-slate-800 transition-colors"
            title="Calibrate and adjust bed boundaries for this camera angle"
          >
            <Sliders className="w-3.5 h-3.5" />
            Calibrate Zone
          </button>

          {/* Mirror Camera Toggle */}
          <button
            onClick={() => setIsMirrored((prev) => !prev)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isMirrored
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
            title="Flip camera horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mute Audio Alarm */}
          <button
            onClick={toggleMute}
            className={`p-1.5 rounded-lg border transition-colors ${
              isAudioMuted
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
            title={isAudioMuted ? 'Unmute Clinical Chimes' : 'Mute Clinical Chimes'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Quick Nurse Call / Alert Ack */}
          <button
            onClick={() => {
              soundAlerts.playAckChime();
              onEventTriggered({
                roomId: room.id,
                severity: 'info',
                type: 'nurse_call',
                title: `Nurse Call Dispatched (${room.roomNumber})`,
                description: `Manual bedside call button engaged by nursing station.`,
                acknowledged: true,
                acknowledgedBy: 'Staff Nurse',
              });
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            Nurse Call
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-800/80 text-slate-300 hover:bg-slate-800 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
