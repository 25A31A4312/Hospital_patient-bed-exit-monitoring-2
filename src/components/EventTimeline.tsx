import React, { useState } from 'react';
import {
  Clock,
  Filter,
  Download,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { AlertSeverity, ClinicalEvent } from '../types/monitor';

interface EventTimelineProps {
  events: ClinicalEvent[];
  onAcknowledge: (id: string, nurseName: string) => void;
  onClear: () => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  onAcknowledge,
  onClear,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [nurseName, setNurseName] = useState<string>('RN L. Taylor');

  const filteredEvents = events.filter((ev) => {
    if (filterSeverity === 'all') return true;
    return ev.severity === filterSeverity;
  });

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-red-400 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/30">
            <AlertCircle className="w-3 h-3 text-red-400" />
            CRITICAL
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            WARNING
          </span>
        );
      case 'info':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
            <Info className="w-3 h-3 text-cyan-400" />
            INFO
          </span>
        );
    }
  };

  const exportCSV = () => {
    const headers = 'ID,Timestamp,Room,Severity,Type,Title,Description,Acknowledged,AcknowledgedBy\n';
    const rows = events
      .map(
        (e) =>
          `"${e.id}","${e.timestamp}","${e.roomId}","${e.severity}","${e.type}","${e.title.replace(
            /"/g,
            '""'
          )}","${e.description.replace(/"/g, '""')}","${e.acknowledged}","${e.acknowledgedBy || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hospital_bed_exit_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Header & Controls */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">
            Clinical Event Timeline &amp; Audit Log
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            ({filteredEvents.length} events)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Filter */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setFilterSeverity('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterSeverity === 'all'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterSeverity('critical')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterSeverity === 'critical'
                  ? 'bg-red-500/20 text-red-300 font-medium'
                  : 'text-slate-400 hover:text-red-400'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setFilterSeverity('warning')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterSeverity === 'warning'
                  ? 'bg-amber-500/20 text-amber-300 font-medium'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              Warning
            </button>
            <button
              onClick={() => setFilterSeverity('info')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterSeverity === 'info'
                  ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                  : 'text-slate-400 hover:text-cyan-400'
              }`}
            >
              Info
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            title="Export CSV Audit Trail"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>

          {/* Clear Log */}
          <button
            onClick={onClear}
            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
            title="Clear event log"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No events recorded matching current filter.
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className={`p-3 rounded-lg transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                ev.severity === 'critical'
                  ? 'bg-red-500/5 hover:bg-red-500/10 border-l-2 border-red-500'
                  : ev.severity === 'warning'
                  ? 'bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-amber-500'
                  : 'bg-slate-850/40 hover:bg-slate-850/80 border-l-2 border-cyan-500'
              }`}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getSeverityBadge(ev.severity)}
                  <span className="font-mono text-xs text-slate-400">
                    {ev.timestamp}
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    {ev.title}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {ev.description}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {ev.acknowledged ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ACK: {ev.acknowledgedBy || 'Nurse'}
                  </span>
                ) : (
                  <button
                    onClick={() => onAcknowledge(ev.id, nurseName)}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-cyan-500/40 hover:border-cyan-400 transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
