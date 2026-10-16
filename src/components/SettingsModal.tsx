import React, { useState, useEffect } from 'react';
import { Settings, Shield, Volume2, Video, Sliders, Check } from 'lucide-react';
import { soundAlerts } from '../services/soundAlerts';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [sensitivity, setSensitivity] = useState<number>(75);
  const [exitGracePeriod, setExitGracePeriod] = useState<number>(2.5);
  const [volume, setVolume] = useState<number>(soundAlerts.getVolume());
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      });
    }
  }, []);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundAlerts.setVolume(newVol);
  };

  const handleTestChime = () => {
    soundAlerts.playWarningChime();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              System &amp; Detection Engine Configuration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs text-slate-300">
          {/* Privacy & Zero-Cloud Processing Guarantee */}
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-emerald-300">
                Local In-Browser Processing Guarantee
              </span>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                Raw video feeds never leave the browser. All MediaPipe pose detection runs locally in memory via WebAssembly/WebGL. Zero patient video or frames are saved or transmitted to external servers.
              </p>
            </div>
          </div>

          {/* Camera Device Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Optical Input Camera
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-slate-850 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {videoDevices.length === 0 ? (
                <option value="">Default System Camera</option>
              ) : (
                videoDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Alarm Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Acoustic Alarm Volume
              </span>
              <button
                onClick={handleTestChime}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Volume2 className="w-3 h-3" />
                Test Alarm Chime
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>Muted (0%)</span>
              <span>{Math.round(volume * 100)}%</span>
              <span>Max (100%)</span>
            </div>
          </div>

          {/* Detection Sensitivity */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <div className="flex justify-between mb-1">
                <span>Pose Sensitivity Threshold</span>
                <span className="font-mono text-cyan-400">{sensitivity}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Exit Grace Period (Seconds Before Full Alarm)</span>
                <span className="font-mono text-cyan-400">{exitGracePeriod}s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.5"
                value={exitGracePeriod}
                onChange={(e) => setExitGracePeriod(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
