export type AppMode = 'assist' | 'navigation' | 'read' | 'describe' | 'ask_ai' | 'emergency';

export type PriorityLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface DetectedObject {
  name: string;
  distance: string;
  distanceMeters?: number;
  direction: 'far left' | 'left' | 'center' | 'right' | 'far right';
  movement: 'stationary' | 'approaching' | 'moving away' | 'crossing path';
  inWalkingPath: boolean;
  priorityLevel: PriorityLevel;
  spokenAlert: string;
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
  { code: 'en-US', name: 'English (US)', nativeName: 'English', flag: '🇺🇸' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'Indian English', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

