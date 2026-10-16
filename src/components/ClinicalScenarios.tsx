import React, { useRef } from 'react';
import {
  Activity,
  Upload,
  Camera,
  Play,
  RotateCcw,
  AlertTriangle,
  UserCheck,
  Footprints,
  HeartCrack,
  FileVideo
} from 'lucide-react';

interface ClinicalScenariosProps {
  activeScenario: string | null;
  onSelectScenario: (scenario: string | null) => void;
  uploadedVideoUrl: string | null;
  onUploadVideo: (url: string | null) => void;
}

export const ClinicalScenarios: React.FC<ClinicalScenariosProps> = ({
  activeScenario,
  onSelectScenario,
  uploadedVideoUrl,
  onUploadVideo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scenarios = [
    {
      id: 'normal_rest',
      title: 'Normal Bed Rest',
      desc: 'Patient resting supine inside bed zone with rhythmic chest breathing.',
      icon: UserCheck,
      severity: 'Normal',
      color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
    },
    {
      id: 'sitting_up',
      title: 'Sitting Up in Bed',
      desc: 'Torso elevates to 65° upright; hips remain inside bed safe zone.',
      icon: Activity,
      severity: 'Info',
      color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5',
    },
    {
      id: 'legs_over_edge',
      title: 'Legs Over Bed Edge',
      desc: 'Lower limbs cross boundary into warning perimeter (pre-exit trigger).',
      icon: AlertTriangle,
      severity: 'Warning',
      color: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
    },
    {
      id: 'standing_exit',
      title: 'Unassisted Bed Exit',
      desc: 'Patient stands vertically beside the bed frame onto the room floor.',
      icon: Activity,
      severity: 'Critical',
      color: 'border-red-500/30 text-red-400 bg-red-500/5',
    },
    {
      id: 'wandering',
      title: 'Active Room Wandering',
      desc: 'Sustained pacing motion across room floor without nurse presence.',
      icon: Footprints,
      severity: 'Critical',
      color: 'border-red-500/30 text-red-400 bg-red-500/5',
    },
    {
      id: 'fall_detected',
      title: 'Sudden Fall Event',
      desc: 'Rapid descent onto floor surface with horizontal body displacement.',
      icon: HeartCrack,
      severity: 'Emergency',
      color: 'border-red-600/40 text-red-500 bg-red-500/10',
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUploadVideo(url);
      onSelectScenario(null);
    }
  };

  const handleResetToLiveCamera = () => {
    onSelectScenario(null);
    onUploadVideo(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Clinical Testing Scenarios &amp; CCTV Footage Upload
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Simulate inpatient clinical postures or upload recorded hospital CCTV surveillance files to evaluate detection accuracy and alarm response times.
          </p>
        </div>

        {(activeScenario || uploadedVideoUrl) && (
          <button
            onClick={handleResetToLiveCamera}
            className="px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            Return to Live Camera Feed
          </button>
        )}
      </div>

      {/* Scenario Presets Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Medical Validation Scenarios
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {activeScenario ? `Active: ${activeScenario}` : 'Mode: Live Camera Tracking'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            const isSelected = activeScenario === sc.id;

            return (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(isSelected ? null : sc.id)}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-cyan-500 bg-slate-800 border-cyan-500'
                    : 'bg-slate-850 hover:bg-slate-800 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${sc.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-xs text-slate-200">
                        {sc.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                      {sc.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {sc.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    {isSelected ? 'Scenario Playing' : 'Click to run test'}
                  </span>
                  <Play className={`w-3 h-3 ${isSelected ? 'text-cyan-400 fill-current' : 'text-slate-500'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hospital Video Upload Box */}
      <div className="pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Offline Clinical Video Ingestion
          </span>
          {uploadedVideoUrl && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <FileVideo className="w-3.5 h-3.5" />
              Custom Video Loaded
            </span>
          )}
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-5 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-slate-800/60 rounded-full text-cyan-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-200">
                Upload Hospital CCTV Surveillance Clip (MP4 / WebM)
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Process actual ward recordings through MediaPipe pose estimation with zero-cloud upload.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
