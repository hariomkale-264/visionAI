import { speechManager } from '../voice/SpeechManager';
import { NavigationRoute, SearchResultPlace, UserCoordinates } from '../types';

type NavigationStateChangeCallback = (state: {
  isNavigating: boolean;
  isPaused: boolean;
  route: NavigationRoute | null;
  currentCoords: UserCoordinates | null;
  status: 'available' | 'unavailable' | 'denied' | 'requesting';
  searchCandidates: SearchResultPlace[] | null;
  pendingDestination: SearchResultPlace | null;
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
    };
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {
        console.error('Nav state callback error', e);
      }
    });
  }

  public initGps() {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.gpsStatus = 'unavailable';
      this.notify();
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
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (err.code === err.PERMISSION_DENIED) {
          this.gpsStatus = 'denied';
        } else {
          this.gpsStatus = 'unavailable';
        }
        this.notify();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
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
        console.warn('WatchPosition update error:', err);
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
      const results: SearchResultPlace[] = data.results || [];
      return results;
    } catch (e) {
      console.error('Destination search error:', e);
      return [];
    }
  }

  // Voice destination flow: extracts destination, asks confirmation if needed
  public async handleDestinationRequest(destinationText: string) {
    if (!this.currentCoords) {
      speechManager.speak(
        'Location is currently unavailable. Please enable GPS permissions so I can guide you.',
        3,
        true
      );
      return;
    }

    speechManager.speak(`Searching for ${destinationText}...`, 4);
    const results = await this.searchDestination(destinationText);

    if (results.length === 0) {
      speechManager.speak(
        `I could not find "${destinationText}". Please try naming a nearby landmark or spelling the address.`,
        3,
        true
      );
      return;
    }

    if (results.length === 1) {
      const place = results[0];
      this.pendingDestination = place;
      this.searchCandidates = null;
      this.notify();

      const distStr = place.distanceMeters ? ` about ${place.distanceMeters} meters away` : '';
      speechManager.speak(
        `I found ${place.name}${distStr}. Do you want walking directions? Say yes to start.`,
        3,
        true
      );
      return;
    }

    // Multiple results: Present accessible choice
    this.searchCandidates = results.slice(0, 3);
    this.pendingDestination = null;
    this.notify();

    const first = results[0];
    const second = results[1];
    const firstDist = first.distanceMeters ? `${first.distanceMeters} meters away` : 'nearby';
    const secondDist = second.distanceMeters ? `${second.distanceMeters} meters away` : 'further';

    speechManager.speak(
      `I found multiple matches. The first is ${first.name}, ${firstDist}. The second is ${second.name}, ${secondDist}. Which one would you like? Say the first one or the second one.`,
      3,
      true
    );
  }

  public selectCandidate(index: number) {
    if (!this.searchCandidates || !this.searchCandidates[index]) return;
    const place = this.searchCandidates[index];
    this.searchCandidates = null;
    this.startNavigationTo(place);
  }

  public confirmPendingDestination(accepted: boolean) {
    if (!accepted) {
      this.pendingDestination = null;
      this.searchCandidates = null;
      this.notify();
      speechManager.speak('Navigation cancelled.', 4);
      return;
    }

    if (this.pendingDestination) {
      const dest = this.pendingDestination;
      this.pendingDestination = null;
      this.searchCandidates = null;
      this.startNavigationTo(dest);
    }
  }

  public async startNavigationTo(place: SearchResultPlace) {
    if (!this.currentCoords) {
      speechManager.speak('Current location is unavailable. Cannot calculate route.', 2, true);
      return;
    }

    speechManager.speak(`Calculating walking route to ${place.name}...`, 4);

    try {
      const url = `/api/navigation/route?startLat=${this.currentCoords.latitude}&startLon=${this.currentCoords.longitude}&endLat=${place.lat}&endLon=${place.lon}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Route calculation failed');
      }

      const data = await res.json();
      if (!data.steps || data.steps.length === 0) {
        throw new Error('No walking route found');
      }

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
      this.lastAnnouncedStepIndex = -1;
      this.notify();

      const timeMinutes = Math.round(data.durationSeconds / 60);
      speechManager.speak(
        `Starting walking navigation to ${place.name}. Total distance is ${data.distanceMeters} meters, approximately ${timeMinutes} minutes.`,
        3,
        true
      );

      // Announce first step
      const firstStep = data.steps[0];
      if (firstStep) {
        speechManager.speak(firstStep.instruction, 3, false);
        this.lastAnnouncedStepIndex = 0;
      }
    } catch (err: any) {
      console.error('Route calculation error:', err);
      speechManager.speak(
        "I couldn't calculate the walking route. Please try another destination.",
        3,
        true
      );
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
      speechManager.speak(
        `You have arrived at your destination: ${route.destinationName}. Navigation completed.`,
        2,
        true
      );
      this.notify();
      return;
    }

    // Check progress to next step
    if (currentStep.location) {
      const [stepLon, stepLat] = currentStep.location;
      const distToStepManeuver = calcDistance(
        this.currentCoords.latitude,
        this.currentCoords.longitude,
        stepLat,
        stepLon
      );

      // Maneuver threshold: within 20m, advance to next step
      if (distToStepManeuver < 20 && route.currentStepIndex < route.steps.length - 1) {
        route.currentStepIndex += 1;
        const nextStep = route.steps[route.currentStepIndex];
        this.lastAnnouncedStepIndex = route.currentStepIndex;
        speechManager.speak(nextStep.instruction, 3, true);
        this.notify();
        return;
      }
    }

    // Off-route check every 15 seconds
    const now = Date.now();
    if (now - this.lastOffRouteCheck > 15000 && currentStep.location) {
      this.lastOffRouteCheck = now;
      const [stepLon, stepLat] = currentStep.location;
      const distToStep = calcDistance(
        this.currentCoords.latitude,
        this.currentCoords.longitude,
        stepLat,
        stepLon
      );

      // If user is far from current step and moving further away
      if (distToStep > 65) {
        speechManager.speak('You are off route. Recalculating walking route.', 3, true);
        this.recalculateRoute();
      }
    }
  }

  public async recalculateRoute() {
    if (!this.currentRoute || !this.currentCoords) return;

    const destLat = this.currentRoute.destinationCoords.lat;
    const destLon = this.currentRoute.destinationCoords.lon;
    const destName = this.currentRoute.destinationName;

    try {
      const url = `/api/navigation/route?startLat=${this.currentCoords.latitude}&startLon=${this.currentCoords.longitude}&endLat=${destLat}&endLon=${destLon}`;
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      if (!data.steps || data.steps.length === 0) return;

      this.currentRoute.steps = data.steps;
      this.currentRoute.currentStepIndex = 0;
      this.currentRoute.distanceMeters = data.distanceMeters;
      this.currentRoute.durationSeconds = data.durationSeconds;
      this.currentRoute.geometry = data.geometry;
      this.lastAnnouncedStepIndex = 0;
      this.notify();

      speechManager.speak(
        `New route calculated. ${data.steps[0].instruction}`,
        3,
        true
      );
    } catch (e) {
      console.warn('Recalculate route failed:', e);
    }
  }

  public repeatInstruction() {
    if (!this.isNavigating || !this.currentRoute) {
      speechManager.speak('Navigation is not currently active.', 4);
      return;
    }
    const currentStep = this.currentRoute.steps[this.currentRoute.currentStepIndex];
    if (currentStep) {
      speechManager.speak(currentStep.instruction, 3, true);
    }
  }

  public announceNextTurn() {
    if (!this.isNavigating || !this.currentRoute) {
      speechManager.speak('Navigation is not currently active.', 4);
      return;
    }
    const nextIndex = this.currentRoute.currentStepIndex + 1;
    if (nextIndex < this.currentRoute.steps.length) {
      const nextStep = this.currentRoute.steps[nextIndex];
      speechManager.speak(`The next turn is: ${nextStep.instruction}`, 3, true);
    } else {
      speechManager.speak('You are approaching your final destination.', 3, true);
    }
  }

  public announceDistanceRemaining() {
    if (!this.isNavigating || !this.currentRoute || !this.currentCoords) {
      speechManager.speak('Navigation is not currently active.', 4);
      return;
    }
    const distToDest = calcDistance(
      this.currentCoords.latitude,
      this.currentCoords.longitude,
      this.currentRoute.destinationCoords.lat,
      this.currentRoute.destinationCoords.lon
    );
    const mins = Math.max(1, Math.round(distToDest / 80)); // 80m/min avg walk speed
    speechManager.speak(
      `Approximately ${distToDest} meters remaining to ${this.currentRoute.destinationName}. About ${mins} minutes walk.`,
      3,
      true
    );
  }

  public pauseNavigation() {
    if (this.isNavigating) {
      this.isPaused = true;
      speechManager.speak('Navigation paused.', 4);
      this.notify();
    }
  }

  public resumeNavigation() {
    if (this.isNavigating) {
      this.isPaused = false;
      speechManager.speak('Navigation resumed.', 4);
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
    speechManager.speak('Navigation stopped.', 4);
    this.notify();
  }

  // Opens external phone map app
  public openExternalMap() {
    if (!this.currentRoute) return;
    const dest = this.currentRoute.destinationCoords;
    const origin = this.currentCoords
      ? `${this.currentCoords.latitude},${this.currentCoords.longitude}`
      : '';
    const destStr = `${dest.lat},${dest.lon}`;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destStr}&travelmode=walking`;
    window.open(url, '_blank');
  }

  public isNavActive(): boolean {
    return this.isNavigating && !this.isPaused;
  }

  public getRoute(): NavigationRoute | null {
    return this.currentRoute;
  }
}

export const navigationManager = new NavigationManager();
