export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ObjectPosition = 'left' | 'center' | 'right';
export type ProximityLevel = 'very-close' | 'close' | 'medium' | 'far';

export interface DetectionResult {
  id: string;
  className: string;
  confidence: number; // 0.0 to 1.0 (e.g. 0.96 for 96%)
  boundingBox: BoundingBox;
  estimatedDistance: number | null; // in meters (e.g. 2.4)
  position: ObjectPosition;
  proximity: ProximityLevel;
  color: string;
  timestamp: number;
  isHazard?: boolean;
}

export interface DetectionHistoryItem {
  id: string;
  className: string;
  confidence: number;
  estimatedDistance: number | null;
  position: ObjectPosition;
  proximity: ProximityLevel;
  timestamp: number;
  color: string;
}

export interface DetectionSettingsConfig {
  enabled: boolean;
  confidenceThreshold: number; // 0.2 to 0.9, default 0.5 (50%)
  distanceEstimation: boolean; // default true
  voiceAnnouncements: boolean; // default true
  dangerAlerts: boolean; // default true
  targetFps: number; // 10, 15, 20, 30
}

export const DEFAULT_DETECTION_SETTINGS: DetectionSettingsConfig = {
  enabled: true,
  confidenceThreshold: 0.5,
  distanceEstimation: true,
  voiceAnnouncements: true,
  dangerAlerts: true,
  targetFps: 15,
};
