import React, { useState } from 'react';
import { X, Check, RotateCcw, Box, Sliders } from 'lucide-react';
import { BedZone, HospitalRoom } from '../types/monitor';

interface BedZoneEditorProps {
  room: HospitalRoom;
  onSave: (updatedZone: BedZone, margin: number) => void;
  onClose: () => void;
}

export const BedZoneEditor: React.FC<BedZoneEditorProps> = ({ room, onSave, onClose }) => {
  const [zone, setZone] = useState<BedZone>({ ...room.bedZone });
  const [margin, setMargin] = useState<number>(room.warningZoneMargin);

  const presets = [
    {
      name: 'Center Hospital Bed (Standard)',
      zone: { id: room.bedZone.id, name: 'Center Bed', x: 0.28, y: 0.35, width: 0.44, height: 0.45 },
      margin: 0.08,
    },
    {
      name: 'Left Wall Bed (Angled View)',
      zone: { id: room.bedZone.id, name: 'Left Wall Bed', x: 0.15, y: 0.32, width: 0.42, height: 0.48 },
      margin: 0.07,
    },
    {
      name: 'Right Wall Bed (Angled View)',
      zone: { id: room.bedZone.id, name: 'Right Wall Bed', x: 0.42, y: 0.32, width: 0.45, height: 0.48 },
      margin: 0.07,
    },
    {
      name: 'Geriatric Recliner / Bedside Chair',
      zone: { id: room.bedZone.id, name: 'Bedside Chair', x: 0.32, y: 0.40, width: 0.36, height: 0.38 },
      margin: 0.06,
    },
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setZone({ ...preset.zone });
    setMargin(preset.margin);
  };

  const handleSave = () => {
    onSave(zone, margin);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Bed Safe Zone Calibration · Room {room.roomNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs text-slate-300">
          <p className="text-slate-400">
            Define the physical bounding coordinates of the patient bed within this CCTV camera angle. Patient movement outside the green safe box triggers the pre-exit warning and bed-exit alarms.
          </p>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Clinical Geometry Presets
            </span>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className="px-3 py-2 text-left bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded-lg transition-colors"
                >
                  <div className="font-medium text-slate-200">{p.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    W: {Math.round(p.zone.width * 100)}% · H: {Math.round(p.zone.height * 100)}%
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders for precise tuning */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Boundary Coordinates (Normalized %)
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Horizontal Position (X)</span>
                  <span className="font-mono text-cyan-400">{Math.round(zone.x * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.01"
                  value={zone.x}
                  onChange={(e) => setZone({ ...zone, x: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Vertical Position (Y)</span>
                  <span className="font-mono text-cyan-400">{Math.round(zone.y * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.01"
                  value={zone.y}
                  onChange={(e) => setZone({ ...zone, y: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Bed Width</span>
                  <span className="font-mono text-cyan-400">{Math.round(zone.width * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="0.8"
                  step="0.01"
                  value={zone.width}
                  onChange={(e) => setZone({ ...zone, width: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Bed Length / Height</span>
                  <span className="font-mono text-cyan-400">{Math.round(zone.height * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="0.8"
                  step="0.01"
                  value={zone.height}
                  onChange={(e) => setZone({ ...zone, height: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Warning Margin (Legs Over Edge Sensitivity)</span>
                <span className="font-mono text-amber-400">{Math.round(margin * 100)}% margin</span>
              </div>
              <input
                type="range"
                min="0.03"
                max="0.18"
                step="0.01"
                value={margin}
                onChange={(e) => setMargin(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Save Calibration
          </button>
        </div>
      </div>
    </div>
  );
};
