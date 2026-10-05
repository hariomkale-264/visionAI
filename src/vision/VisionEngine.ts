import { cameraManager } from '../camera/CameraManager';
import { audioManager } from '../voice/AudioManager';
import {
  AppMode,
  DetectedObject,
  NormalizedBoundingBox,
  PriorityLevel,
  SafetyLevel,
} from '../types';

type DetectionCallback = (
  objects: DetectedObject[],
  meta?: { summary?: string; text?: string; trafficAlert?: string }
) => void;

interface TrackedObjectState {
  id: string;
  name: string;
  direction: string;
  distanceMeters: number;
  lastAnnounced: number;
  priorityLevel: PriorityLevel;
}

class VisionEngine {
  private isRunning = false;
  private isAnalyzing = false;
  private currentMode: AppMode = 'assist';
  private loopTimer: any = null;
  private listeners: Set<DetectionCallback> = new Set();
  private trackedHistory: Map<string, TrackedObjectState> = new Map();
  private objectCounters: Map<string, number> = new Map();
  private currentDetectedObjects: DetectedObject[] = [];
  private walkingContext = '';
  private currentLanguage = 'en-IN';
  private confidenceThreshold = 0.5;

  public setLanguage(lang: string) {
    this.currentLanguage = lang;
  }

  public getLanguage() {
    return this.currentLanguage;
  }

  public setConfidenceThreshold(threshold: number) {
    this.confidenceThreshold = Math.max(0.3, Math.min(0.9, threshold));
  }

  public onDetection(callback: DetectionCallback) {
    this.listeners.add(callback);
    callback(this.currentDetectedObjects);
    return () => this.listeners.delete(callback);
  }

  public getLatestObjects(): DetectedObject[] {
    return this.currentDetectedObjects;
  }

  private notify(
    objects: DetectedObject[],
    meta?: { summary?: string; text?: string; trafficAlert?: string }
  ) {
    this.currentDetectedObjects = objects;
    this.listeners.forEach((cb) => {
      try {
        cb(objects, meta);
      } catch (e) {
        console.error('Detection callback error', e);
      }
    });
  }

  public setWalkingContext(context: string) {
    this.walkingContext = context;
  }

  public startLoop(mode: AppMode = 'assist') {
    this.currentMode = mode;
    this.isRunning = true;
    if (this.loopTimer) clearTimeout(this.loopTimer);
    this.scheduleNextSample(300);
  }

  public stopLoop() {
    this.isRunning = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.isAnalyzing = false;
  }

  private scheduleNextSample(delayMs: number) {
    if (!this.isRunning) return;
    this.loopTimer = setTimeout(async () => {
      if (this.isRunning && !this.isAnalyzing) {
        await this.sampleAndAnalyze();
      }
      // Adaptive rate: 1800ms for active assist/navigation, 3500ms for idle
      const nextDelay =
        this.currentMode === 'navigation' || this.currentMode === 'assist' ? 1800 : 3500;
      this.scheduleNextSample(nextDelay);
    }, delayMs);
  }

  public async sampleAndAnalyze(overrideMode?: AppMode): Promise<any> {
    if (!cameraManager.isConnected()) {
      return null;
    }
    if (this.isAnalyzing && !overrideMode) {
      return null;
    }

    this.isAnalyzing = true;
    const frame = cameraManager.captureFrame(800, 0.7);
    if (!frame) {
      this.isAnalyzing = false;
      return null;
    }

    const mode = overrideMode || this.currentMode;

    try {
      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: frame,
          mode,
          walkingContext: this.walkingContext,
          language: this.currentLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Vision server returned status ${response.status}`);
      }

      const data = await response.json();
      this.handleVisionResult(data, mode);
      return data;
    } catch (err: any) {
      console.warn('Vision engine sample error:', err.message);
      return null;
    } finally {
      this.isAnalyzing = false;
    }
  }

  public async readText(): Promise<string> {
    const data = await this.sampleAndAnalyze('read');
    if (!data) return 'Could not capture camera frame to read text.';
    return data.extractedText || data.spokenAlert || 'No readable text found.';
  }

  public async describeSurroundings(): Promise<string> {
    const data = await this.sampleAndAnalyze('describe');
    if (!data) return 'Could not capture camera frame to describe scene.';
    return data.sceneSummary || data.spokenAlert || 'Surroundings analyzed.';
  }

  private calculateDirection(
    box?: NormalizedBoundingBox,
    givenDir?: string
  ): 'far left' | 'left' | 'center' | 'right' | 'far right' {
    if (box) {
      const centerX = (box.xmin + box.xmax) / 2;
      if (centerX < 200) return 'far left';
      if (centerX < 400) return 'left';
      if (centerX < 600) return 'center';
      if (centerX < 800) return 'right';
      return 'far right';
    }
    if (
      givenDir === 'far left' ||
      givenDir === 'left' ||
      givenDir === 'center' ||
      givenDir === 'right' ||
      givenDir === 'far right'
    ) {
      return givenDir;
    }
    return 'center';
  }

  private calculateSafetyLevel(
    distMeters?: number,
    inWalkingPath = false,
    movement?: string,
    priority: PriorityLevel = 4
  ): SafetyLevel {
    const d = distMeters !== undefined ? distMeters : 3;

    if (
      priority === 1 ||
      d < 1.0 ||
      (inWalkingPath && d < 1.5) ||
      (movement === 'approaching' && d < 2.5)
    ) {
      return 'critical'; // Red
    }
    if (d < 2.0 || inWalkingPath) {
      return 'danger'; // Orange
    }
    if (d <= 5.0) {
      return 'caution'; // Yellow
    }
    return 'safe'; // Green
  }

  private handleVisionResult(data: any, mode: AppMode) {
    const now = Date.now();

    if (mode === 'read') {
      const text = data.extractedText || '';
      const spoken =
        data.spokenAlert ||
        (text
          ? `I can see: ${text}`
          : `I couldn't find readable text. Please point the camera more directly at the text.`);
      audioManager.speak(spoken, 5, true);
      this.notify([], { text, summary: spoken });
      return;
    }

    if (mode === 'describe') {
      const summary = data.sceneSummary || data.spokenAlert || 'Surroundings analyzed.';
      audioManager.speak(summary, 6, true);
      this.notify([], { summary });
      return;
    }

    // Assist & Navigation modes: Parse bounding boxes, tracking, and safety
    const rawObjects: any[] = data.objects || [];
    const detected: DetectedObject[] = [];

    for (const obj of rawObjects) {
      const conf = typeof obj.confidence === 'number' ? obj.confidence : 0.85;
      if (conf < this.confidenceThreshold) continue;

      let boundingBox: NormalizedBoundingBox | undefined = undefined;
      if (Array.isArray(obj.box_2d) && obj.box_2d.length === 4) {
        boundingBox = {
          ymin: Math.max(0, Math.min(1000, Math.round(obj.box_2d[0]))),
          xmin: Math.max(0, Math.min(1000, Math.round(obj.box_2d[1]))),
          ymax: Math.max(0, Math.min(1000, Math.round(obj.box_2d[2]))),
          xmax: Math.max(0, Math.min(1000, Math.round(obj.box_2d[3]))),
        };
      }

      const direction = this.calculateDirection(boundingBox, obj.direction);
      const distMeters =
        typeof obj.distanceMeters === 'number'
          ? Math.round(obj.distanceMeters * 10) / 10
          : undefined;

      // Virtual walking corridor check: center 30%-70% width, lower 40%-100% height
      let inWalkingPath = Boolean(obj.inWalkingPath);
      if (boundingBox) {
        const centerX = (boundingBox.xmin + boundingBox.xmax) / 2;
        const bottomY = boundingBox.ymax;
        if (centerX >= 300 && centerX <= 700 && bottomY >= 400) {
          inWalkingPath = true;
        }
      }

      const name = obj.name || 'Obstacle';
      const movement = obj.movement || 'stationary';
      const priorityLevel = (obj.priorityLevel || (inWalkingPath ? 2 : 4)) as PriorityLevel;
      const safetyLevel = this.calculateSafetyLevel(distMeters, inWalkingPath, movement, priorityLevel);

      // Stable tracking ID
      const baseKey = name.toLowerCase();
      let count = this.objectCounters.get(baseKey) || 0;
      count++;
      this.objectCounters.set(baseKey, count % 99);
      const trackingId = `${baseKey}#${count}`;

      // Distance string formatted cleanly (e.g. "~1.5 m")
      let distStr = obj.distance || '';
      if (!distStr && distMeters !== undefined) {
        distStr = `~${distMeters} m`;
      }

      detected.push({
        id: trackingId,
        name,
        distance: distStr || 'nearby',
        distanceMeters: distMeters,
        direction,
        movement,
        inWalkingPath,
        priorityLevel,
        spokenAlert: obj.spokenAlert || `${name} ${direction}.`,
        boundingBox,
        confidence: conf,
        safetyLevel,
        timestamp: now,
      });
    }

    // Traffic / road crossing check
    if (data.trafficAlert) {
      audioManager.speak(data.trafficAlert, 1, false);
    }

    // Sort detected objects: most dangerous first (critical priority 1 first)
    detected.sort((a, b) => a.priorityLevel - b.priorityLevel);

    // Announce most urgent obstacle if cooldown passed
    let announcementMade = false;

    for (const item of detected) {
      const trackKey = `${item.name.toLowerCase()}_${item.direction}`;
      const prev = this.trackedHistory.get(trackKey);

      let shouldAnnounce = false;

      if (!prev) {
        // First detection
        shouldAnnounce = true;
      } else {
        const timeDiff = now - prev.lastAnnounced;
        const distDiff =
          typeof item.distanceMeters === 'number' && typeof prev.distanceMeters === 'number'
            ? Math.abs(item.distanceMeters - prev.distanceMeters)
            : 0;

        // Announce again if:
        // 1. Critical danger level 1 after 3 seconds
        // 2. Object moved significantly closer (>0.8m closer)
        // 3. Object entered direct walking path
        // 4. Cooldown time elapsed (6s for high priority, 10s for normal)
        if (item.priorityLevel === 1 && timeDiff > 3000) {
          shouldAnnounce = true;
        } else if (distDiff >= 0.8 && (item.distanceMeters || 0) < prev.distanceMeters) {
          shouldAnnounce = true;
        } else if (item.inWalkingPath && timeDiff > 5000) {
          shouldAnnounce = true;
        } else if (timeDiff > 10000) {
          shouldAnnounce = true;
        }
      }

      if (shouldAnnounce && !announcementMade) {
        this.trackedHistory.set(trackKey, {
          id: item.id || trackKey,
          name: item.name,
          direction: item.direction,
          distanceMeters: item.distanceMeters || 2,
          lastAnnounced: now,
          priorityLevel: item.priorityLevel,
        });

        // Level 1 Critical Warning interrupts ongoing speech
        audioManager.speak(item.spokenAlert, item.priorityLevel, item.priorityLevel === 1);
        announcementMade = true;
      }
    }

    // Prune stale tracking history older than 20s
    for (const [k, v] of this.trackedHistory.entries()) {
      if (now - v.lastAnnounced > 20000) {
        this.trackedHistory.delete(k);
      }
    }

    this.notify(detected, { trafficAlert: data.trafficAlert });
  }
}

export const visionEngine = new VisionEngine();
