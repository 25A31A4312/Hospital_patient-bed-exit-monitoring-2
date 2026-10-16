import React from 'react';
import { BookOpen, ShieldCheck, AlertCircle, CheckCircle, FileText } from 'lucide-react';

export const ProtocolDocs: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6 max-w-4xl">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          Hospital Clinical Fall-Prevention Protocol &amp; Morse Fall Scale (MFS)
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Evidence-based bedside monitoring guidelines compliant with Joint Commission National Patient Safety Goals (NPSG 09.02.01).
        </p>
      </div>

      {/* Morse Fall Scale Breakdown */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Morse Fall Scale Assessment Matrix
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800 rounded-lg">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="p-2.5 border-b border-slate-800">Risk Item</th>
                <th className="p-2.5 border-b border-slate-800">Operational Criteria</th>
                <th className="p-2.5 border-b border-slate-800 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="p-2.5 font-medium">1. History of Falling</td>
                <td className="p-2.5 text-slate-400">No fall history (0) / History within current admission or past 3 months (25)</td>
                <td className="p-2.5 font-mono text-right text-cyan-400">0 / 25</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">2. Secondary Diagnosis</td>
                <td className="p-2.5 text-slate-400">No (0) / More than one medical diagnosis listed in chart (15)</td>
                <td className="p-2.5 font-mono text-right text-cyan-400">0 / 15</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">3. Ambulatory Aid</td>
                <td className="p-2.5 text-slate-400">None / Bedrest / Nurse assist (0) / Crutches / Cane / Walker (15) / Furniture support (30)</td>
                <td className="p-2.5 font-mono text-right text-cyan-400">0 / 15 / 30</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">4. Intravenous Therapy / Heparin Lock</td>
                <td className="p-2.5 text-slate-400">No (0) / Yes (20)</td>
                <td className="p-2.5 font-mono text-right text-cyan-400">0 / 20</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">5. Gait / Transferring</td>
                <td className="p-2.5 text-slate-400">Normal / Bedrest / Wheelchair (0) / Weak gait (10) / Impaired (20)</td>
                <td className="p-2.5 font-mono text-right text-cyan-400">0 / 10 / 20</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">6. Mental Status</td>
                <td className="p-2.5 text-slate-400">Oriented to own ability (0) / Overestimates ability or forgets limitations (15)</td>
                <td className="p-2.5 font-mono text-right text-cyan-400">0 / 15</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Clinical Alarm Action Workflow */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <h4 className="text-sm font-semibold text-slate-200">
          Graduated 3-Tier Alert Action Workflow
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 bg-cyan-500/5 border border-cyan-500/20 rounded-lg space-y-1.5">
            <div className="text-xs font-semibold text-cyan-400">Level 1: Sitting Up</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Gentle bedside advisory chime. Informs nurse that patient has elevated torso. Check patient call light and comfort needs.
            </p>
          </div>

          <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-1.5">
            <div className="text-xs font-semibold text-amber-400">Level 2: Legs Over Edge</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pre-exit warning alarm. Immediate bedside response required within 30 seconds before patient places feet onto floor.
            </p>
          </div>

          <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-lg space-y-1.5">
            <div className="text-xs font-semibold text-red-400">Level 3: Out-of-Bed / Fall</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Critical acoustic alarm + pager dispatch. Patient standing unassisted or sudden floor impact. Emergency nursing response dispatched.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
