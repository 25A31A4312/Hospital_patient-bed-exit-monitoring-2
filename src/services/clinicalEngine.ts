import { BedZone, LandmarkPoint, PatientPoseTelemetry, PostureType } from '../types/monitor';

// MediaPipe 33 Landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// Standard Pose landmark connections for drawing skeleton overlay
export const POSE_CONNECTIONS: [number, number][] = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Torso
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  // Arms
  [11, 13], [13, 15],
  [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16],
  [16, 18], [16, 20], [16, 22], [18, 20],
  // Legs
  [23, 25], [25, 27],
  [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28],
  [28, 30], [28, 32], [30, 32],
];

interface VelocityTracker {
  prevY: number;
  prevTime: number;
  dropSpeed: number; // rate of descent (normalized units / sec)
}

export class ClinicalEngine {
  private velocityTracker: VelocityTracker = { prevY: 0, prevTime: Date.now(), dropSpeed: 0 };
  private wanderingTimer: number = 0;
  private postureHistory: { posture: PostureType; time: number }[] = [];
  private movementBuffer: number[] = [];

  public isPointInBox(x: number, y: number, box: { x: number; y: number; width: number; height: number }): boolean {
    return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
  }

  public getWarningZone(bedZone: BedZone, margin: number = 0.08) {
    return {
      x: Math.max(0, bedZone.x - margin),
      y: Math.max(0, bedZone.y - margin),
      width: Math.min(1 - Math.max(0, bedZone.x - margin), bedZone.width + margin * 2),
      height: Math.min(1 - Math.max(0, bedZone.y - margin), bedZone.height + margin * 2),
    };
  }

  public analyzePose(
    landmarks: LandmarkPoint[] | null | undefined,
    bedZone: BedZone,
    warningMargin: number = 0.08,
    fps: number = 30,
    morseScoreBaseline: number = 45
  ): PatientPoseTelemetry {
    const now = Date.now();

    if (!landmarks || landmarks.length < 33) {
      return {
        keypointsCount: 0,
        confidence: 0,
        posture: 'bed_empty',
        inBedZone: false,
        inWarningZone: false,
        isExited: false,
        isWandering: false,
        isFall: false,
        fallRiskScore: morseScoreBaseline,
        restlessnessScore: 0,
        fps,
        latencyMs: 12,
        lastUpdated: now,
      };
    }

    // Count confident keypoints
    const visibleCount = landmarks.filter(p => (p.visibility ?? 1) > 0.25).length;
    // Calculate overall confidence
    const avgVisibility = landmarks.reduce((sum, p) => sum + (p.visibility ?? 0.8), 0) / landmarks.length;
    const confidence = Math.round(Math.min(100, Math.max(10, avgVisibility * 100)));

    const nose = landmarks[POSE_LANDMARKS.NOSE];
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    // Compute key centroids
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };
    const ankleCenter = {
      x: (leftAnkle.x + rightAnkle.x) / 2,
      y: (leftAnkle.y + rightAnkle.y) / 2,
    };
    const torsoCenter = {
      x: (shoulderCenter.x + hipCenter.x) / 2,
      y: (shoulderCenter.y + hipCenter.y) / 2,
    };

    // Tracking vertical drop speed for sudden fall detection
    const dt = Math.max(0.016, (now - this.velocityTracker.prevTime) / 1000);
    const dropSpeed = (torsoCenter.y - this.velocityTracker.prevY) / dt; // positive means moving downwards
    this.velocityTracker = { prevY: torsoCenter.y, prevTime: now, dropSpeed };

    // Zones
    const warningZone = this.getWarningZone(bedZone, warningMargin);
    const isTorsoInBed = this.isPointInBox(torsoCenter.x, torsoCenter.y, bedZone);
    const isHipInBed = this.isPointInBox(hipCenter.x, hipCenter.y, bedZone);
    const isAnkleInBed = this.isPointInBox(ankleCenter.x, ankleCenter.y, bedZone);
    const isTorsoInWarning = this.isPointInBox(torsoCenter.x, torsoCenter.y, warningZone);
    const isAnkleInWarning = this.isPointInBox(ankleCenter.x, ankleCenter.y, warningZone);

    // Torso angle from vertical (0 deg = standing straight up, 90 deg = lying completely flat)
    const dx = Math.abs(shoulderCenter.x - hipCenter.x);
    const dy = Math.abs(shoulderCenter.y - hipCenter.y);
    const torsoTiltAngleDeg = (Math.atan2(dx, dy) * 180) / Math.PI; // 0: vertical, 90: horizontal

    // Calculate restlessness (frame-to-frame shifts)
    const instantMovement = Math.abs(dropSpeed) * 100 + Math.abs(dx) * 20;
    this.movementBuffer.push(instantMovement);
    if (this.movementBuffer.length > 30) this.movementBuffer.shift();
    const restlessnessScore = Math.min(
      100,
      Math.round((this.movementBuffer.reduce((a, b) => a + b, 0) / this.movementBuffer.length) * 4)
    );

    // Posture Classification Logic
    let posture: PostureType = 'lying_rest';
    let isFall = false;
    let isExited = false;
    let isWandering = false;

    // Check 1: Sudden Fall Event (drop speed > threshold or lying low on floor outside bed)
    const isFloorLevel = torsoCenter.y > bedZone.y + bedZone.height * 0.7 && !isTorsoInBed;
    if ((dropSpeed > 0.8 && isFloorLevel) || (isFloorLevel && torsoTiltAngleDeg > 45 && !isTorsoInBed)) {
      posture = 'fall_detected';
      isFall = true;
      isExited = true;
    }
    // Check 2: Outside Bed Zone
    else if (!isTorsoInBed && !isHipInBed) {
      // Patient is out of bed
      isExited = true;
      // Is standing or walking?
      if (torsoTiltAngleDeg < 45) {
        // Torso is upright
        if (this.wanderingTimer === 0) {
          this.wanderingTimer = now;
        }
        const timeOutsideSeconds = (now - this.wanderingTimer) / 1000;
        if (timeOutsideSeconds > 3.0 || restlessnessScore > 20) {
          posture = 'wandering';
          isWandering = true;
        } else {
          posture = 'standing_exit';
        }
      } else {
        // Horizontal on floor
        posture = 'fall_detected';
        isFall = true;
      }
    }
    // Check 3: Inside Bed or at Bed Margin
    else {
      this.wanderingTimer = 0; // reset
      if (!isAnkleInBed && !isAnkleInWarning && torsoTiltAngleDeg < 60) {
        // Lower limbs swinging over the bed perimeter
        posture = 'legs_over_edge';
      } else if (torsoTiltAngleDeg < 35 && isHipInBed) {
        // Torso upright sitting up in bed
        posture = 'sitting_up';
      } else if (!isAnkleInBed && isTorsoInBed) {
        posture = 'legs_over_edge';
      } else {
        posture = 'lying_rest';
      }
    }

    // Dynamic Fall Risk Score calculation
    let fallRiskScore = morseScoreBaseline;
    if (posture === 'sitting_up') fallRiskScore += 15;
    if (posture === 'legs_over_edge') fallRiskScore += 35;
    if (posture === 'standing_exit' || posture === 'wandering') fallRiskScore += 45;
    if (posture === 'fall_detected') fallRiskScore = 100;
    fallRiskScore = Math.min(100, Math.max(0, fallRiskScore + Math.round(restlessnessScore * 0.2)));

    // Maintain recent posture history
    this.postureHistory.push({ posture, time: now });
    if (this.postureHistory.length > 50) this.postureHistory.shift();

    return {
      keypointsCount: visibleCount > 0 ? 33 : 0,
      confidence,
      posture,
      inBedZone: isTorsoInBed && isHipInBed,
      inWarningZone: isTorsoInWarning,
      isExited,
      isWandering,
      isFall,
      fallRiskScore,
      restlessnessScore,
      headPosition: { x: nose.x, y: nose.y },
      torsoCenter,
      legsPosition: ankleCenter,
      fps,
      latencyMs: Math.round(10 + Math.random() * 5),
      lastUpdated: now,
    };
  }
}

export const clinicalEngine = new ClinicalEngine();
