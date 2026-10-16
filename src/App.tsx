import React, { useState } from 'react';
import {
  Video,
  Bed,
  Clock,
  Activity,
  TrendingUp,
  BookOpen,
  Settings,
  Sparkles,
  Shield,
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Sliders,
  Volume2,
  VolumeX,
  PhoneCall
} from 'lucide-react';
import {
  BedZone,
  ClinicalEvent,
  DisplayMode,
  HospitalRoom,
  PostureType
} from './types/monitor';
import { CCTVMonitoringView } from './components/CCTVMonitoringView';
import { BedZoneEditor } from './components/BedZoneEditor';
import { EventTimeline } from './components/EventTimeline';
import { ClinicalScenarios } from './components/ClinicalScenarios';
import { RoomSelector } from './components/RoomSelector';
import { AnalyticsView } from './components/AnalyticsView';
import { ProtocolDocs } from './components/ProtocolDocs';
import { SettingsModal } from './components/SettingsModal';
import { AiIncidentReport } from './components/AiIncidentReport';
import { soundAlerts } from './services/soundAlerts';

// Initial Mock Rooms for Ward Overview
const INITIAL_ROOMS: HospitalRoom[] = [
  {
    id: 'room-204',
    roomNumber: '204-A',
    department: 'Acute Geriatric Care',
    patientName: 'Eleanor Vance',
    patientAge: 81,
    admissionReason: 'Post-op Hip Arthroplasty (Day 2)',
    morseFallScore: 75,
    highRiskProtocol: true,
    currentStatus: 'lying_rest',
    severity: 'normal',
    bedZone: { id: 'bz-204', name: 'Bed 204A Zone', x: 0.28, y: 0.35, width: 0.44, height: 0.45 },
    warningZoneMargin: 0.08,
    timeInBedMinutes: 142,
    nurseAssigned: 'RN L. Taylor',
  },
  {
    id: 'room-205',
    roomNumber: '205-B',
    department: 'Orthopedic Rehabilitation',
    patientName: 'Arthur Pendelton',
    patientAge: 76,
    admissionReason: 'Femoral Fracture / Delirium Risk',
    morseFallScore: 65,
    highRiskProtocol: true,
    currentStatus: 'lying_rest',
    severity: 'normal',
    bedZone: { id: 'bz-205', name: 'Bed 205B Zone', x: 0.25, y: 0.30, width: 0.48, height: 0.46 },
    warningZoneMargin: 0.08,
    timeInBedMinutes: 89,
    nurseAssigned: 'RN M. Zhao',
  },
  {
    id: 'room-210',
    roomNumber: '210-ICU',
    department: 'Neurological ICU',
    patientName: 'David K. Hoffman',
    patientAge: 69,
    admissionReason: 'Ischemic Stroke / Transient Aphasia',
    morseFallScore: 85,
    highRiskProtocol: true,
    currentStatus: 'lying_rest',
    severity: 'normal',
    bedZone: { id: 'bz-210', name: 'Bed 210 Zone', x: 0.30, y: 0.32, width: 0.42, height: 0.44 },
    warningZoneMargin: 0.07,
    timeInBedMinutes: 310,
    nurseAssigned: 'RN S. Patel',
  },
  {
    id: 'room-212',
    roomNumber: '212-C',
    department: 'Step-Down Cardiac Unit',
    patientName: 'Margaret Rivera',
    patientAge: 84,
    admissionReason: 'Arrhythmia / Orthostatic Hypotension',
    morseFallScore: 50,
    highRiskProtocol: true,
    currentStatus: 'lying_rest',
    severity: 'normal',
    bedZone: { id: 'bz-212', name: 'Bed 212 Zone', x: 0.26, y: 0.34, width: 0.46, height: 0.45 },
    warningZoneMargin: 0.08,
    timeInBedMinutes: 65,
    nurseAssigned: 'RN L. Taylor',
  },
];

// Initial Audit Trail Events
const INITIAL_EVENTS: ClinicalEvent[] = [
  {
    id: 'evt-1',
    timestamp: '22:14:08',
    timeEpoch: Date.now() - 3600000,
    roomId: 'room-204',
    severity: 'info',
    type: 'sitting_up',
    title: 'Patient Sat Up in Bed (204-A)',
    description: 'Torso elevated 50°. Nurse bedside check confirmed patient adjusting pillow.',
    acknowledged: true,
    acknowledgedBy: 'RN L. Taylor',
  },
  {
    id: 'evt-2',
    timestamp: '23:05:42',
    timeEpoch: Date.now() - 2400000,
    roomId: 'room-204',
    severity: 'warning',
    type: 'legs_over_edge',
    title: 'Bed-Exit Pre-Warning: Legs Over Edge (204-A)',
    description: 'Patient attempted unassisted exit to retrieve water tumbler. Intercepted by night nurse.',
    acknowledged: true,
    acknowledgedBy: 'RN L. Taylor',
  },
  {
    id: 'evt-3',
    timestamp: '00:48:19',
    timeEpoch: Date.now() - 900000,
    roomId: 'room-204',
    severity: 'info',
    type: 'nurse_call',
    title: 'Bedside Call Light Triggered (204-A)',
    description: 'Patient requested assistance for bathroom transfer. Protocol observed.',
    acknowledged: true,
    acknowledgedBy: 'RN L. Taylor',
  },
];

export default function App() {
  const [rooms, setRooms] = useState<HospitalRoom[]>(INITIAL_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('room-204');
  const [activeTab, setActiveTab] = useState<
    'cctv' | 'rooms' | 'timeline' | 'scenarios' | 'analytics' | 'protocols' | 'ai_tools'
  >('cctv');

  // Display Mode: CCTV View (DEFAULT) as explicitly requested!
  const [displayMode, setDisplayMode] = useState<DisplayMode>('cctv');

  const [events, setEvents] = useState<ClinicalEvent[]>(INITIAL_EVENTS);
  const [isZoneEditorOpen, setIsZoneEditorOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);

  const currentRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  // Handle triggered clinical event
  const handleEventTriggered = (
    eventData: Omit<ClinicalEvent, 'id' | 'timestamp' | 'timeEpoch'>
  ) => {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const newEvent: ClinicalEvent = {
      ...eventData,
      id: `evt-${Date.now()}`,
      timestamp: timeStr,
      timeEpoch: Date.now(),
    };

    setEvents((prev) => [newEvent, ...prev]);

    // Update room severity status
    setRooms((prev) =>
      prev.map((r) =>
        r.id === eventData.roomId
          ? {
              ...r,
              severity: eventData.severity,
              currentStatus: eventData.type as PostureType,
            }
          : r
      )
    );
  };

  // Acknowledge event
  const handleAcknowledgeEvent = (id: string, nurseName: string) => {
    soundAlerts.playAckChime();
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, acknowledged: true, acknowledgedBy: nurseName } : e))
    );
  };

  // Clear events
  const handleClearEvents = () => {
    setEvents([]);
  };

  // Update Bed Zone calibration
  const handleSaveBedZone = (updatedZone: BedZone, margin: number) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === currentRoom.id
          ? { ...r, bedZone: updatedZone, warningZoneMargin: margin }
          : r
      )
    );
    handleEventTriggered({
      roomId: currentRoom.id,
      severity: 'info',
      type: 'zone_calibrated',
      title: `Bed Safe Zone Calibrated (${currentRoom.roomNumber})`,
      description: `Geometry coordinates updated to W:${Math.round(
        updatedZone.width * 100
      )}% H:${Math.round(updatedZone.height * 100)}% with ${Math.round(
        margin * 100
      )}% warning margin.`,
      acknowledged: true,
      acknowledgedBy: 'System Tech',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Bar Contract (1 line wordmark, single-line links, 1 primary action) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
            <Video className="w-4 h-4" />
          </div>
          <a
            href="/"
            className="text-sm font-bold tracking-tight text-white hover:text-cyan-300 transition-colors"
          >
            T226 Hospital Patient Bed-Exit &amp; Wandering Monitor
          </a>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden xl:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('cctv')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'cctv' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Live AI Monitoring
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'rooms' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Ward Beds
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'timeline' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Event Timeline
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'scenarios' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Clinical Scenarios
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'analytics' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Mobility Trends
          </button>
          <button
            onClick={() => setActiveTab('protocols')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'protocols' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Morse Scale Protocol
          </button>
          <button
            onClick={() => setActiveTab('ai_tools')}
            className={`whitespace-nowrap shrink-0 transition-colors flex items-center gap-1 ${
              activeTab === 'ai_tools' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            AI Studio &amp; Veo
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            title="System Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              soundAlerts.playCriticalAlarm();
              handleEventTriggered({
                roomId: currentRoom.id,
                severity: 'critical',
                type: 'nurse_call',
                title: `EMERGENCY NURSE CALL DISPATCHED (${currentRoom.roomNumber})`,
                description: `Emergency bedside staff dispatch requested by central monitoring console.`,
                acknowledged: false,
              });
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Emergency Dispatch
          </button>
        </div>
      </header>

      {/* Main Layout Container with Sidebar and Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto p-4 md:p-6 gap-6">
        {/* Left Sidebar Navigation & Inpatient Status */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
          {/* Active Inpatient Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-cyan-400">
                ACTIVE MONITOR
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                BED LIVE
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">
                {currentRoom.patientName}
              </h2>
              <div className="text-xs text-slate-400">
                Age {currentRoom.patientAge} · Room {currentRoom.roomNumber}
              </div>
              <div className="text-[11px] text-slate-500">
                {currentRoom.department}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Morse Fall Score:</span>
                <span className="font-mono font-bold text-red-400">
                  {currentRoom.morseFallScore} (High Risk)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Primary Nurse:</span>
                <span className="text-slate-200">{currentRoom.nurseAssigned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time in Bed:</span>
                <span className="font-mono text-slate-300">
                  {currentRoom.timeInBedMinutes} min
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-lg space-y-1 text-xs">
            <button
              onClick={() => setActiveTab('cctv')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                activeTab === 'cctv'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Video className="w-4 h-4" />
              Live CCTV Monitoring
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                activeTab === 'rooms'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Bed className="w-4 h-4" />
              Ward Beds ({rooms.length})
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                activeTab === 'timeline'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" />
                Event Timeline
              </div>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400">
                {events.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('scenarios')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                activeTab === 'scenarios'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              Clinical Scenarios
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                activeTab === 'analytics'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Mobility Trends
            </button>

            <button
              onClick={() => setActiveTab('protocols')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                activeTab === 'protocols'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Clinical Protocol &amp; SOP
            </button>

            <button
              onClick={() => setActiveTab('ai_tools')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors font-medium ${
                activeTab === 'ai_tools'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              AI Studio &amp; Veo Studio
            </button>
          </div>

          {/* Bed Zone Quick Calibration Trigger */}
          <button
            onClick={() => setIsZoneEditorOpen(true)}
            className="w-full p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition-colors flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Calibrate Bed Zone
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              {Math.round(currentRoom.bedZone.width * 100)}% x {Math.round(currentRoom.bedZone.height * 100)}%
            </span>
          </button>

          {/* Privacy Guarantee Note */}
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Shield className="w-3.5 h-3.5" />
              Local-Only Vision Privacy
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Optical processing executes entirely in browser client memory via MediaPipe WASM. No video feed is recorded or uploaded.
            </p>
          </div>
        </aside>

        {/* Center / Right Content Area */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Tab 1: Live CCTV Monitoring View (Main View) */}
          {activeTab === 'cctv' && (
            <div className="space-y-6">
              {/* CCTV Feed Panel */}
              <CCTVMonitoringView
                room={currentRoom}
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
                onEventTriggered={handleEventTriggered}
                onOpenBedZoneEditor={() => setIsZoneEditorOpen(true)}
                activeScenario={activeScenario}
                uploadedVideoUrl={uploadedVideoUrl}
              />

              {/* Quick Ward Beds Preview Strip */}
              <RoomSelector
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={(id) => setSelectedRoomId(id)}
              />

              {/* Compact Event Timeline at bottom of CCTV view */}
              <div className="h-80">
                <EventTimeline
                  events={events}
                  onAcknowledge={handleAcknowledgeEvent}
                  onClear={handleClearEvents}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Ward Inpatient Beds */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              <RoomSelector
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={(id) => {
                  setSelectedRoomId(id);
                  setActiveTab('cctv');
                }}
              />
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Multi-Bed Ward Management Summary
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  All 4 patient beds are connected to local edge CCTV camera streams. Clicking any bed above switches the primary optical monitor and loads the room's calibrated bed safe zone and clinical parameters.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Event Timeline & Audit Log */}
          {activeTab === 'timeline' && (
            <div className="h-[700px]">
              <EventTimeline
                events={events}
                onAcknowledge={handleAcknowledgeEvent}
                onClear={handleClearEvents}
              />
            </div>
          )}

          {/* Tab 4: Clinical Scenarios & Video Upload */}
          {activeTab === 'scenarios' && (
            <div className="space-y-6">
              <ClinicalScenarios
                activeScenario={activeScenario}
                onSelectScenario={(sc) => {
                  setActiveScenario(sc);
                  if (sc) setActiveTab('cctv');
                }}
                uploadedVideoUrl={uploadedVideoUrl}
                onUploadVideo={(url) => {
                  setUploadedVideoUrl(url);
                  if (url) setActiveTab('cctv');
                }}
              />
            </div>
          )}

          {/* Tab 5: Mobility Analytics & Trends */}
          {activeTab === 'analytics' && <AnalyticsView room={currentRoom} />}

          {/* Tab 6: Clinical Protocols & Morse Fall Scale Guide */}
          {activeTab === 'protocols' && <ProtocolDocs />}

          {/* Tab 7: AI Clinical Incident Assistant, 1K/2K/4K Image Gen & Veo Video Animation */}
          {activeTab === 'ai_tools' && (
            <AiIncidentReport room={currentRoom} events={events} />
          )}
        </main>
      </div>

      {/* Bed Zone Editor Modal */}
      {isZoneEditorOpen && (
        <BedZoneEditor
          room={currentRoom}
          onSave={handleSaveBedZone}
          onClose={() => setIsZoneEditorOpen(false)}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}
