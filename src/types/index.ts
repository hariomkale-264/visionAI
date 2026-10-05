export type AppMode = 'assist' | 'navigation' | 'read' | 'describe' | 'emergency';

export type PriorityLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
// 1: CRITICAL SAFETY WARNING (approaching vehicle, drop-off, obstacle <1m in path)
// 2: HIGH-PRIORITY OBSTACLE (obstacle 1-2m in walking path)
// 3: NAVIGATION INSTRUCTION (turn-by-turn guidance)
// 4: USER REQUEST RESPONSE (voice command reply)
// 5: OCR / TEXT READING (extracted text readout)
// 6: SCENE DESCRIPTION (spatial surroundings summary)
// 7: LOW-PRIORITY INFORMATION (distant/peripheral objects)

export interface NormalizedBoundingBox {
  ymin: number; // 0 to 1000
  xmin: number; // 0 to 1000
  ymax: number; // 0 to 1000
  xmax: number; // 0 to 1000
}

export type SafetyLevel = 'critical' | 'danger' | 'caution' | 'safe';

export interface DetectedObject {
  id?: string;
  name: string;
  distance: string;
  distanceMeters?: number;
  direction: 'far left' | 'left' | 'center' | 'right' | 'far right';
  movement: 'stationary' | 'approaching' | 'moving away' | 'crossing path';
  inWalkingPath: boolean;
  priorityLevel: PriorityLevel;
  spokenAlert: string;
  boundingBox?: NormalizedBoundingBox;
  confidence?: number;
  safetyLevel?: SafetyLevel;
  timestamp?: number;
}

export interface NavigationStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string;
  modifier?: string;
  streetName: string;
  location?: [number, number]; // [lon, lat]
}

export interface NavigationRoute {
  destinationName: string;
  destinationCoords: { lat: number; lon: number };
  distanceMeters: number;
  durationSeconds: number;
  steps: NavigationStep[];
  currentStepIndex: number;
  geometry?: any;
}

export interface SearchResultPlace {
  id: string | number;
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  distanceMeters: number | null;
  type?: string;
  category?: string;
}

export interface SpokenQueueItem {
  id: string;
  text: string;
  priority: PriorityLevel;
  timestamp: number;
  interruptCurrent?: boolean;
}

export interface DeviceStatus {
  camera: 'connected' | 'disconnected' | 'denied' | 'requesting';
  microphone: 'ready' | 'listening' | 'disconnected' | 'denied' | 'requesting';
  gps: 'available' | 'unavailable' | 'denied' | 'requesting';
  internet: 'connected' | 'offline';
  bluetooth: 'connected' | 'disconnected';
  ai: 'ready' | 'processing' | 'error' | 'unavailable';
}

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number | null;
  speed?: number | null;
}

export interface AppLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: AppLanguage[] = [
  { code: 'en-IN', name: 'English (India)', nativeName: 'Indian English', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ur-IN', name: 'Urdu', nativeName: 'اردو', flag: '🇮🇳' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
];
