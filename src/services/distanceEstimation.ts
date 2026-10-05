import { BoundingBox, ObjectPosition, ProximityLevel } from '../types/detection';

/**
 * Distance Estimation Service
 * 
 * IMPORTANT ARCHITECTURAL NOTE:
 * A standard monocular 2D RGB camera cannot measure physical depth directly 
 * without depth sensors (LiDAR/ToF), stereoscopic disparity, or exact intrinsic calibration.
 * 
 * This service implements approximate monocular distance estimation based on:
 * 1. Prior geometric knowledge of canonical real-world physical object heights (meters).
 * 2. Pinhole camera focal length model: Distance = (FocalLength * RealHeight) / BoundingBoxPixelHeight.
 * 3. Normalized FOV geometry adaptable across resolutions (640x480, 1280x720, 1920x1080).
 * 
 * The system is designed with the `IDistanceEstimator` interface so it can be seamlessly 
 * swapped with a real DepthAI, WebXR depth buffer, or ML depth model in the future.
 */

export interface IDistanceEstimator {
  estimateDistance(
    className: string,
    box: BoundingBox,
    frameWidth: number,
    frameHeight: number
  ): number | null;
  getProximity(distanceMeters: number | null): ProximityLevel;
  getPosition(box: BoundingBox, frameWidth: number): ObjectPosition;
}

// Canonical physical heights in meters for common COCO dataset objects
const CANONICAL_HEIGHTS_METERS: Record<string, number> = {
  person: 1.70,
  car: 1.50,
  bus: 3.20,
  truck: 3.00,
  motorcycle: 1.15,
  bicycle: 1.05,
  dog: 0.55,
  cat: 0.28,
  horse: 1.65,
  sheep: 0.75,
  cow: 1.45,
  elephant: 3.00,
  bear: 1.80,
  zebra: 1.40,
  giraffe: 4.80,
  backpack: 0.45,
  umbrella: 0.80,
  handbag: 0.35,
  suitcase: 0.65,
  'traffic light': 0.90,
  'fire hydrant': 0.75,
  'stop sign': 0.75,
  'parking meter': 1.20,
  bench: 0.85,
  chair: 0.85,
  couch: 0.85,
  'potted plant': 0.50,
  bed: 0.70,
  'dining table': 0.75,
  toilet: 0.75,
  tv: 0.60,
  laptop: 0.24,
  mouse: 0.04,
  keyboard: 0.03,
  'cell phone': 0.15,
  microwave: 0.32,
  oven: 0.85,
  toaster: 0.20,
  sink: 0.85,
  refrigerator: 1.75,
  book: 0.24,
  clock: 0.35,
  vase: 0.30,
  scissors: 0.18,
  'teddy bear': 0.40,
  toothbrush: 0.18,
  bottle: 0.26,
  cup: 0.12,
  fork: 0.18,
  knife: 0.22,
  spoon: 0.16,
  bowl: 0.08,
};

export class DistanceEstimator implements IDistanceEstimator {
  // Approximate vertical field-of-view of typical mobile / laptop webcams (~55° to 65°)
  private readonly defaultVFOVRad = (58 * Math.PI) / 180;

  /**
   * Estimate distance in meters using pinhole projection model
   */
  public estimateDistance(
    className: string,
    box: BoundingBox,
    frameWidth: number,
    frameHeight: number
  ): number | null {
    if (!box || box.height <= 0 || frameHeight <= 0) return null;

    const lowerClass = className.toLowerCase();
    const realHeightMeters = CANONICAL_HEIGHTS_METERS[lowerClass] || 0.8;

    // Effective focal length in pixels based on vertical FOV
    const focalLengthPixels = frameHeight / (2 * Math.tan(this.defaultVFOVRad / 2));

    // Distance = (FocalLength * RealHeight) / PixelHeight
    let distance = (focalLengthPixels * realHeightMeters) / box.height;

    // Ground plane perspective compensation if near bottom of frame
    const bottomY = box.y + box.height;
    if (bottomY > frameHeight * 0.85 && distance > 2.0) {
      // Object is right in front of the camera at ground level
      distance = Math.max(0.6, distance * 0.85);
    }

    // Clamp to realistic bounds (0.3m to 35m) and round to 1 decimal place
    const clamped = Math.max(0.4, Math.min(35.0, distance));
    return Math.round(clamped * 10) / 10;
  }

  /**
   * Classify proximity based on user specifications:
   * VERY CLOSE: < 1.5 m
   * CLOSE: 1.5–3 m
   * MEDIUM: 3–7 m
   * FAR: > 7 m
   */
  public getProximity(distanceMeters: number | null): ProximityLevel {
    if (distanceMeters === null) return 'medium';
    if (distanceMeters < 1.5) return 'very-close';
    if (distanceMeters <= 3.0) return 'close';
    if (distanceMeters <= 7.0) return 'medium';
    return 'far';
  }

  /**
   * Determine horizontal position relative to frame:
   * Left: center x < 35%
   * Center: 35% - 65%
   * Right: center x > 65%
   */
  public getPosition(box: BoundingBox, frameWidth: number): ObjectPosition {
    if (frameWidth <= 0) return 'center';
    const centerX = box.x + box.width / 2;
    const ratio = centerX / frameWidth;

    if (ratio < 0.35) return 'left';
    if (ratio > 0.65) return 'right';
    return 'center';
  }

  /**
   * Colors matching the user's reference image:
   * - person: Magenta / Pink (#E000B0)
   * - car / vehicle: Vivid Lime Green (#00FF2A)
   * - dog / cat / animals: Cyan (#00C5FF)
   * - traffic light: Bright Yellow (#FFF000)
   * - signs: Vibrant Blue (#0044FF)
   */
  public getCategoryColor(className: string): string {
    const c = className.toLowerCase();
    if (c === 'person') return '#E000B0'; // Magenta (Matches reference image)
    if (['car', 'bus', 'truck', 'motorcycle', 'bicycle'].includes(c)) return '#00FF2A'; // Lime Green
    if (['dog', 'cat', 'bird', 'horse', 'sheep', 'cow', 'animal'].includes(c)) return '#00C5FF'; // Cyan
    if (['traffic light', 'traffic_light'].includes(c)) return '#FFF000'; // Yellow
    if (['stop sign', 'sign', 'parking meter', 'fire hydrant'].includes(c)) return '#0044FF'; // Blue
    if (['chair', 'couch', 'table', 'dining table', 'bed', 'bench'].includes(c)) return '#FF7700'; // Orange
    if (['bottle', 'cup', 'laptop', 'cell phone', 'backpack'].includes(c)) return '#A855F7'; // Purple
    return '#10B981'; // Emerald fallback
  }

  /**
   * Returns emoji representation for panel display
   */
  public getClassEmoji(className: string): string {
    const c = className.toLowerCase();
    switch (c) {
      case 'person': return '👤';
      case 'car': return '🚗';
      case 'bus': return '🚌';
      case 'truck': return '🚚';
      case 'motorcycle': return '🏍️';
      case 'bicycle': return '🚲';
      case 'dog': return '🐕';
      case 'cat': return '🐈';
      case 'traffic light': return '🚦';
      case 'stop sign': return '🛑';
      case 'chair': return '🪑';
      case 'table': return '🪵';
      case 'bottle': return '🍾';
      case 'backpack': return '🎒';
      case 'laptop': return '💻';
      case 'cell phone': return '📱';
      default: return '📦';
    }
  }
}

export const distanceEstimator = new DistanceEstimator();
