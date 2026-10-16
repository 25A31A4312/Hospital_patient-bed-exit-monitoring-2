import React from 'react';
import {
  TrendingUp,
  Clock,
  ShieldAlert,
  Activity,
  Award,
  Users,
  AlertTriangle
} from 'lucide-react';
import { HospitalRoom } from '../types/monitor';

interface AnalyticsViewProps {
  room: HospitalRoom;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ room }) => {
  // Clinical hourly restlessness & bed presence distribution
  const hourlyData = [
    { hour: '20:00', presence: 100, restlessness: 8, exits: 0 },
    { hour: '21:00', presence: 100, restlessness: 14, exits: 0 },
    { hour: '22:00', presence: 95, restlessness: 28, exits: 1 },
    { hour: '23:00', presence: 100, restlessness: 10, exits: 0 },
    { hour: '00:00', presence: 100, restlessness: 12, exits: 0 },
    { hour: '01:00', presence: 88, restlessness: 42, exits: 2 },
    { hour: '02:00', presence: 92, restlessness: 35, exits: 1 },
    { hour: '03:00', presence: 100, restlessness: 15, exits: 0 },
    { hour: '04:00', presence: 100, restlessness: 18, exits: 0 },
    { hour: '05:00', presence: 90, restlessness: 48, exits: 1 },
    { hour: '06:00', presence: 96, restlessness: 30, exits: 0 },
    { hour: '07:00', presence: 100, restlessness: 22, exits: 0 },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Inpatient Mobility &amp; Fall Risk Analytics · Room {room.roomNumber}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric trajectory and bed occupancy history for {room.patientName}.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Shift Interval: <strong className="text-white">Night 20:00 - 08:00</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-850 rounded-lg border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Bed Presence Ratio</div>
          <div className="text-xl font-bold font-mono text-white mt-1">96.8%</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Continuous safe occupancy</div>
        </div>

        <div className="p-3.5 bg-slate-850 rounded-lg border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Exit Attempts (Shift)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">4 Events</div>
          <div className="text-[10px] text-slate-400 mt-0.5">All intercepted prior to fall</div>
        </div>

        <div className="p-3.5 bg-slate-850 rounded-lg border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Avg Staff Intercept Time</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">16.4 sec</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Target: &lt; 30 sec</div>
        </div>

        <div className="p-3.5 bg-slate-850 rounded-lg border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Morse Fall Risk Rating</div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">{room.morseFallScore} / 125</div>
          <div className="text-[10px] text-red-400 mt-0.5">High Fall Risk Protocol</div>
        </div>
      </div>

      {/* Mobility & Restlessness Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">
            Hourly Restlessness &amp; Movement Intensity (%)
          </span>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-cyan-500 rounded-sm" />
              Restlessness Score
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
              Bed-Exit Event
            </span>
          </div>
        </div>

        <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
          {hourlyData.map((d, i) => {
            const heightPercent = Math.min(100, Math.max(10, d.restlessness * 1.8));

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-slate-800 text-[10px] text-slate-200 px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10 border border-slate-700">
                  {d.hour}: {d.restlessness}% movement ({d.exits} exits)
                </div>

                {/* Exit marker */}
                {d.exits > 0 && (
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping mb-1" />
                )}

                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t transition-all ${
                    d.restlessness > 35
                      ? 'bg-amber-500 hover:bg-amber-400'
                      : 'bg-cyan-500/70 hover:bg-cyan-400'
                  }`}
                />
                <span className="text-[10px] font-mono text-slate-500">
                  {d.hour.slice(0, 2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
