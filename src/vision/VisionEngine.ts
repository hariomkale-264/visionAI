import { cameraManager } from '../camera/CameraManager';
import { speechManager } from '../voice/SpeechManager';
import { AppMode, DetectedObject, PriorityLevel } from '../types';

type DetectionCallback = (objects: DetectedObject[], meta?: { summary?: string; text?: string; trafficAlert?: string }) => void;

interface TrackedObject {
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
  private trackedHistory: Map<string, TrackedObject> = new Map();
  private walkingContext = '';
  private currentLanguage = 'en-US';

  public setLanguage(lang: string) {
    this.currentLanguage = lang;
  }

  public getLanguage() {
    return this.currentLanguage;
  }

  public onDetection(callback: DetectionCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(objects: DetectedObject[], meta?: { summary?: string; text?: string; trafficAlert?: string }) {
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
      // Re-schedule based on current mode: 1800ms for assist/navigation
      const nextDelay = this.currentMode === 'navigation' || this.currentMode === 'assist' ? 1800 : 3500;
      this.scheduleNextSample(nextDelay);
    }, delayMs);
  }

  public async sampleAndAnalyze(overrideMode?: AppMode, userQuestion?: string): Promise<any> {
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
          userQuestion: userQuestion || '',
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

  private handleVisionResult(data: any, mode: AppMode) {
    const now = Date.now();

    if (mode === 'read') {
      const text = data.extractedText || '';
      const spoken = data.spokenAlert || (text ? `The text says: ${text}` : `No readable text found.`);
      speechManager.speak(spoken, 4, true);
      this.notify([], { text, summary: spoken });
      return;
    }

    if (mode === 'describe') {
      const summary = data.sceneSummary || data.spokenAlert || 'Surroundings analyzed.';
      speechManager.speak(summary, 5, true);
      this.notify([], { summary });
      return;
    }

    if (mode === 'ask_ai') {
      const answer = data.answer || data.spokenAlert || 'I could not determine an answer.';
      speechManager.speak(answer, 4, true);
      this.notify([], { summary: answer });
      return;
    }

    // Assist & Navigation modes
    const rawObjects: any[] = data.objects || [];
    const detected: DetectedObject[] = rawObjects.map((obj) => ({
      name: obj.name || 'Obstacle',
      distance: obj.distance || 'nearby',
      distanceMeters: typeof obj.distanceMeters === 'number' ? obj.distanceMeters : undefined,
      direction: obj.direction || 'center',
      movement: obj.movement || 'stationary',
      inWalkingPath: Boolean(obj.inWalkingPath),
      priorityLevel: (obj.priorityLevel || 3) as PriorityLevel,
      spokenAlert: obj.spokenAlert || `${obj.name} ahead.`,
      timestamp: now,
    }));

    // Traffic / road crossing check
    if (data.trafficAlert) {
      speechManager.speak(data.trafficAlert, 1, false);
    }

    // Filter & Cooldown prioritization
    // Sort by priority level (1 is most urgent)
    detected.sort((a, b) => a.priorityLevel - b.priorityLevel);

    let mostUrgentSpoken = false;

    for (const item of detected) {
      const key = `${item.name.toLowerCase()}_${item.direction}`;
      const prev = this.trackedHistory.get(key);

      let shouldAnnounce = false;

      if (!prev) {
        // First time seeing this object
        shouldAnnounce = true;
      } else {
        const timeDiff = now - prev.lastAnnounced;
        const distDiff =
          typeof item.distanceMeters === 'number' && typeof prev.distanceMeters === 'number'
            ? Math.abs(item.distanceMeters - prev.distanceMeters)
            : 0;

        // Announce again if:
        // 1. Critical danger level 1 and still present after 4s
        // 2. Distance changed significantly (>0.7m closer)
        // 3. Object became directly obstructive in walking path
        // 4. Over 10 seconds have elapsed and it's high priority
        if (item.priorityLevel === 1 && timeDiff > 4000) {
          shouldAnnounce = true;
        } else if (distDiff >= 0.7 && (item.distanceMeters || 0) < prev.distanceMeters) {
          shouldAnnounce = true;
        } else if (item.inWalkingPath && timeDiff > 6000) {
          shouldAnnounce = true;
        } else if (timeDiff > 12000) {
          shouldAnnounce = true;
        }
      }

      if (shouldAnnounce && !mostUrgentSpoken) {
        this.trackedHistory.set(key, {
          name: item.name,
          direction: item.direction,
          distanceMeters: item.distanceMeters || 2,
          lastAnnounced: now,
          priorityLevel: item.priorityLevel,
        });

        // Critical safety warnings (Level 1) interrupt other messages
        speechManager.speak(item.spokenAlert, item.priorityLevel, item.priorityLevel === 1);
        mostUrgentSpoken = true;
      }
    }

    // Clean up stale objects older than 18 seconds
    for (const [k, v] of this.trackedHistory.entries()) {
      if (now - v.lastAnnounced > 18000) {
        this.trackedHistory.delete(k);
      }
    }

    this.notify(detected, { trafficAlert: data.trafficAlert });
  }
}

export const visionEngine = new VisionEngine();
