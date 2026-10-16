import React from 'react';
import { Bed, AlertCircle, ShieldAlert, CheckCircle, Activity, User } from 'lucide-react';
import { HospitalRoom } from '../types/monitor';

interface RoomSelectorProps {
  rooms: HospitalRoom[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
}

export const RoomSelector: React.FC<RoomSelectorProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bed className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Ward Inpatient Beds</h3>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {rooms.length} Units Active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {rooms.map((room) => {
          const isSelected = room.id === selectedRoomId;
          const isCritical = room.severity === 'critical';
          const isWarning = room.severity === 'warning';

          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={`p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-cyan-500 bg-slate-800/90 shadow-sm'
                  : 'border-slate-800 bg-slate-850/50 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-white">
                    ROOM {room.roomNumber}
                  </span>
                  {isCritical ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                      <AlertCircle className="w-2.5 h-2.5" />
                      ALARM
                    </span>
                  ) : isWarning ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      PRE-EXIT
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle className="w-2.5 h-2.5" />
                      IN BED
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 font-medium truncate">
                  {room.patientName} ({room.patientAge}y)
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {room.department} · {room.admissionReason}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">
                  Morse: <strong className={room.morseFallScore >= 45 ? 'text-red-400' : 'text-amber-400'}>{room.morseFallScore}</strong>
                </span>
                <span className="text-slate-400">
                  Nurse: {room.nurseAssigned}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
