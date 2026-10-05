import { audioManager } from '../voice/AudioManager';
import { NavigationRoute, SearchResultPlace, UserCoordinates } from '../types';

type NavigationStateChangeCallback = (state: {
  isNavigating: boolean;
  isPaused: boolean;
  route: NavigationRoute | null;
  currentCoords: UserCoordinates | null;
  status: 'available' | 'unavailable' | 'denied' | 'requesting';
  searchCandidates: SearchResultPlace[] | null;
  pendingDestination: SearchResultPlace | null;
  pendingDestinationText: string | null;
  waitingForConfirmation: boolean;
}) => void;

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

class NavigationManager {
  private isNavigating = false;
  private isPaused = false;
  private currentCoords: UserCoordinates | null = null;
  private watchId: number | null = null;
  private gpsStatus: 'available' | 'unavailable' | 'denied' | 'requesting' = 'unavailable';
  private currentRoute: NavigationRoute | null = null;
  private searchCandidates: SearchResultPlace[] | null = null;
  private pendingDestination: SearchResultPlace | null = null;
  private pendingDestinationText: string | null = null;
  private waitingForConfirmation = false;
  private listeners: Set<NavigationStateChangeCallback> = new Set();
  private lastAnnouncedStepIndex = -1;
  private lastOffRouteCheck = 0;

  constructor() {
    this.initGps();
  }

  public subscribe(callback: NavigationStateChangeCallback) {
    this.listeners.add(callback);
    this.notify();
    return () => this.listeners.delete(callback);
  }

  private notify() {
    const state = {
      isNavigating: this.isNavigating,
      isPaused: this.isPaused,
      route: this.currentRoute,
      currentCoords: this.currentCoords,
      status: this.gpsStatus,
      searchCandidates: this.searchCandidates,
      pendingDestination: this.pendingDestination,
      pendingDestinationText: this.pendingDestinationText,
      waitingForConfirmation: this.waitingForConfirmation,
    };
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {
        console.error('Nav state callback error', e);
      }
    });
  }

  public initGps(): Promise<UserCoordinates | null> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        this.gpsStatus = 'unavailable';
        this.notify();
        resolve(null);
        return;
      }

      this.gpsStatus = 'requesting';
      this.notify();

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.currentCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          };
          this.gpsStatus = 'available';
          this.startWatchingPosition();
          this.notify();
          resolve(this.currentCoords);
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
          if (err.code === err.PERMISSION_DENIED) {
            this.gpsStatus = 'denied';
          } else {
            this.gpsStatus = 'unavailable';
          }
          this.notify();
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }

  private startWatchingPosition() {
    if (this.watchId !== null || typeof window === 'undefined' || !navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.currentCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        };
        this.gpsStatus = 'available';
        this.onPositionUpdate();
        this.notify();
      },
      (err) => {
        console.warn('WatchPosition error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  }

  public getCurrentCoords() {
    return this.currentCoords;
  }

  public getGpsStatus() {
    return this.gpsStatus;
  }

  public isWaitingForConfirmation(): boolean {
    return this.waitingForConfirmation;
  }

  public async searchDestination(query: string): Promise<SearchResultPlace[]> {
    if (!query || !query.trim()) return [];

    const lat = this.currentCoords?.latitude;
    const lon = this.currentCoords?.longitude;

    let url = `/api/navigation/search?q=${encodeURIComponent(query.trim())}`;
    if (typeof lat === 'number' && typeof lon === 'number') {
      url += `&lat=${lat}&lon=${lon}`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      return (data.results || []) as SearchResultPlace[];
    } catch (e) {
      console.error('Destination search error:', e);
      return [];
    }
  }

  /**
   * SPECIFIC WORKFLOW FOR VOICE-BASED GOOGLE MAPS NAVIGATION:
   * User: "I want to go to Pune Railway Station."
   * AI: "Getting your current location."
   * AI: "Your destination is Pune Railway Station. Do you want to start walking navigation?"
   * User: "Yes."
   * AI: "Opening Google Maps walking navigation."
   */
  public async handleDestinationRequest(destinationText: string) {
    const cleanDest = destinationText.trim();
    if (!cleanDest) return;

    audioManager.speak('Getting your current location.', 3, true);

    // Refresh position if needed
    if (!this.currentCoords) {
      await this.initGps();
    }

    this.pendingDestinationText = cleanDest;
    this.waitingForConfirmation = true;

    // Search place coordinates in parallel to verify place exists
    const searchPlaces = await this.searchDestination(cleanDest);
    if (searchPlaces.length > 0) {
      this.pendingDestination = searchPlaces[0];
    } else {
      this.pendingDestination = null;
    }

    this.notify();

    // Ask user confirmation
    audioManager.speak(
      `Your destination is ${cleanDest}. Do you want to start walking navigation? Say yes to start.`,
      3,
      true
    );
  }

  public confirmPendingDestination(accepted: boolean) {
    if (!this.waitingForConfirmation && !this.pendingDestination && !this.pendingDestinationText) {
      return;
    }

    if (!accepted) {
      this.pendingDestination = null;
      this.pendingDestinationText = null;
      this.waitingForConfirmation = false;
      this.searchCandidates = null;
      this.notify();
      audioManager.speak('Navigation cancelled.', 4, true);
      return;
    }

    const destText = this.pendingDestinationText || this.pendingDestination?.name || 'destination';
    this.waitingForConfirmation = false;
    this.notify();

    audioManager.speak(
      'Opening Google Maps walking navigation. Please stay alert for obstacles and traffic.',
      3,
      true
    );

    // Open Google Maps walking directions
    this.openGoogleMapsNavigation(destText, this.pendingDestination ? { lat: this.pendingDestination.lat, lon: this.pendingDestination.lon } : undefined);

    // If destination place coordinates are available, also start in-app guide
    if (this.pendingDestination) {
      this.startNavigationTo(this.pendingDestination);
    }
  }

  public openGoogleMapsNavigation(destination: string, coords?: { lat: number; lon: number }) {
    let originParam = '';
    if (this.currentCoords) {
      originParam = `&origin=${this.currentCoords.latitude},${this.currentCoords.longitude}`;
    }

    let destParam = '';
    if (coords) {
      destParam = `&destination=${coords.lat},${coords.lon}`;
    } else {
      destParam = `&destination=${encodeURIComponent(destination)}`;
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1${originParam}${destParam}&travelmode=walking`;

    try {
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('window.open blocked, falling back to location.href:', e);
      window.location.href = mapsUrl;
    }
  }

  public async startNavigationTo(place: SearchResultPlace) {
    if (!this.currentCoords) {
      return;
    }

    try {
      const url = `/api/navigation/route?startLat=${this.currentCoords.latitude}&startLon=${this.currentCoords.longitude}&endLat=${place.lat}&endLon=${place.lon}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Route calculation failed');

      const data = await res.json();
      if (!data.steps || data.steps.length === 0) return;

      this.currentRoute = {
        destinationName: place.name,
        destinationCoords: { lat: place.lat, lon: place.lon },
        distanceMeters: data.distanceMeters,
        durationSeconds: data.durationSeconds,
        steps: data.steps,
        currentStepIndex: 0,
        geometry: data.geometry,
      };

      this.isNavigating = true;
      this.isPaused = false;
      this.lastAnnouncedStepIndex = 0;
      this.notify();

      const firstStep = data.steps[0];
      if (firstStep) {
        audioManager.speak(firstStep.instruction, 3, false);
      }
    } catch (err: any) {
      console.warn('In-app route background calculation warning:', err);
    }
  }

  private onPositionUpdate() {
    if (!this.isNavigating || this.isPaused || !this.currentRoute || !this.currentCoords) return;

    const route = this.currentRoute;
    const currentStep = route.steps[route.currentStepIndex];
    if (!currentStep) return;

    // Check distance to destination
    const distToDest = calcDistance(
      this.currentCoords.latitude,
      this.currentCoords.longitude,
      route.destinationCoords.lat,
      route.destinationCoords.lon
    );

    if (distToDest <= 15) {
      this.isNavigating = false;
      audioManager.speak(
        `You have arrived at your destination: ${route.destinationName}. Navigation completed.`,
        2,
        true
      );
      this.notify();
      return;
    }

    // Step progression
    if (currentStep.location) {
      const [stepLon, stepLat] = currentStep.location;
      const distToStepManeuver = calcDistance(
        this.currentCoords.latitude,
        this.currentCoords.longitude,
        stepLat,
        stepLon
      );

      if (distToStepManeuver <= 12) {
        const nextIndex = route.currentStepIndex + 1;
        if (nextIndex < route.steps.length) {
          route.currentStepIndex = nextIndex;
          const nextStep = route.steps[nextIndex];
          audioManager.speak(nextStep.instruction, 3, false);
          this.notify();
        }
      }
    }
  }

  public repeatInstruction() {
    if (!this.isNavigating || !this.currentRoute) {
      audioManager.speak('Navigation is not currently active.', 4, true);
      return;
    }
    const currentStep = this.currentRoute.steps[this.currentRoute.currentStepIndex];
    if (currentStep) {
      audioManager.speak(currentStep.instruction, 3, true);
    }
  }

  public announceNextTurn() {
    if (!this.isNavigating || !this.currentRoute) {
      audioManager.speak('Navigation is not currently active.', 4, true);
      return;
    }
    const nextIndex = this.currentRoute.currentStepIndex + 1;
    if (nextIndex < this.currentRoute.steps.length) {
      const nextStep = this.currentRoute.steps[nextIndex];
      audioManager.speak(`The next turn is: ${nextStep.instruction}`, 3, true);
    } else {
      audioManager.speak('You are approaching your final destination.', 3, true);
    }
  }

  public announceDistanceRemaining() {
    if (!this.isNavigating || !this.currentRoute || !this.currentCoords) {
      audioManager.speak('Navigation is not currently active.', 4, true);
      return;
    }
    const distToDest = calcDistance(
      this.currentCoords.latitude,
      this.currentCoords.longitude,
      this.currentRoute.destinationCoords.lat,
      this.currentRoute.destinationCoords.lon
    );
    const mins = Math.max(1, Math.round(distToDest / 80));
    audioManager.speak(
      `Approximately ${distToDest} meters remaining to ${this.currentRoute.destinationName}. About ${mins} minutes walk.`,
      3,
      true
    );
  }

  public pauseNavigation() {
    if (this.isNavigating) {
      this.isPaused = true;
      audioManager.speak('Navigation paused.', 4, true);
      this.notify();
    }
  }

  public resumeNavigation() {
    if (this.isNavigating) {
      this.isPaused = false;
      audioManager.speak('Navigation resumed.', 4, true);
      this.repeatInstruction();
      this.notify();
    }
  }

  public stopNavigation() {
    this.isNavigating = false;
    this.isPaused = false;
    this.currentRoute = null;
    this.searchCandidates = null;
    this.pendingDestination = null;
    this.pendingDestinationText = null;
    this.waitingForConfirmation = false;
    audioManager.speak('Navigation stopped.', 4, true);
    this.notify();
  }

  public openExternalMap() {
    if (this.currentRoute) {
      this.openGoogleMapsNavigation(
        this.currentRoute.destinationName,
        this.currentRoute.destinationCoords
      );
    } else if (this.pendingDestinationText) {
      this.openGoogleMapsNavigation(this.pendingDestinationText);
    }
  }

  public isNavActive(): boolean {
    return this.isNavigating && !this.isPaused;
  }

  public getRoute(): NavigationRoute | null {
    return this.currentRoute;
  }
}

export const navigationManager = new NavigationManager();
