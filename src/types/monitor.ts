export type PostureType =
  | 'lying_rest'
  | 'sitting_up'
  | 'legs_over_edge'
  | 'standing_exit'
  | 'wandering'
  | 'fall_detected'
  | 'bed_empty';

export type AlertSeverity = 'normal' | 'info' | 'warning' | 'critical';

export type DisplayMode = 'cctv' | 'ai_overlay' | 'privacy';

export interface Point2D {
  x: number; // normalized 0 to 1
  y: number; // normalized 0 to 1
}

export interface BedZone {
  id: string;
  name: string;
  // Normalized coordinates (0-1)
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PatientPoseTelemetry {
  keypointsCount: number; // e.g. 33
  confidence: number; // 0 to 100%
  posture: PostureType;
  inBedZone: boolean;
  inWarningZone: boolean;
  isExited: boolean;
  isWandering: boolean;
  isFall: boolean;
  fallRiskScore: number; // 0 to 100
  restlessnessScore: number; // 0 to 100
  headPosition?: Point2D;
  torsoCenter?: Point2D;
  legsPosition?: Point2D;
  fps: number;
  latencyMs: number;
  lastUpdated: number;
}

export interface ClinicalEvent {
  id: string;
  timestamp: string;
  timeEpoch: number;
  roomId: string;
  severity: AlertSeverity;
  type: PostureType | 'system_alert' | 'nurse_call' | 'zone_calibrated';
  title: string;
  description: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export interface HospitalRoom {
  id: string;
  roomNumber: string;
  department: string;
  patientName: string;
  patientAge: number;
  admissionReason: string;
  morseFallScore: number; // 0-125
  highRiskProtocol: boolean;
  currentStatus: PostureType;
  severity: AlertSeverity;
  bedZone: BedZone;
  warningZoneMargin: number; // e.g. 0.08
  timeInBedMinutes: number;
  nurseAssigned: string;
}
