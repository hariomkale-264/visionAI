import { audioManager } from '../voice/AudioManager';
import { DetectionResult } from '../types/detection';

export class VoiceAlertService {
  private lastAnnounced: Map<string, number> = new Map();
  private isEnabled = true;
  private dangerAlertsEnabled = true;

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public setDangerAlertsEnabled(enabled: boolean) {
    this.dangerAlertsEnabled = enabled;
  }

  public announceDetections(detections: DetectionResult[]) {
    if (!this.isEnabled || detections.length === 0) return;

    const now = Date.now();

    // 1. Check for immediate critical / very-close alerts (< 1.5m)
    if (this.dangerAlertsEnabled) {
      const veryClose = detections.find((d) => d.proximity === 'very-close');
      if (veryClose) {
        const key = `danger_${veryClose.className}_${veryClose.position}`;
        const last = this.lastAnnounced.get(key) || 0;

        if (now - last > 3500) { // 3.5s cooldown for critical proximity warnings
          this.lastAnnounced.set(key, now);
          const distStr = veryClose.estimatedDistance !== null ? `, approximately ${veryClose.estimatedDistance} meters` : '';
          const msg = `Warning. ${veryClose.className} very close${distStr}.`;
          audioManager.speak(msg, 1, true);
          return;
        }
      }
    }

    // 2. Announce top priority object (highest confidence / closest)
    // Sort by proximity then confidence
    const sorted = [...detections].sort((a, b) => {
      const distA = a.estimatedDistance ?? 99;
      const distB = b.estimatedDistance ?? 99;
      return distA - distB;
    });

    for (const obj of sorted) {
      const key = `obj_${obj.className}_${obj.position}`;
      const last = this.lastAnnounced.get(key) || 0;

      // 7 second cooldown per object & position
      if (now - last > 7000) {
        this.lastAnnounced.set(key, now);

        let phrase = '';
        const posText = obj.position === 'center' ? 'ahead' : `on your ${obj.position}`;
        const distText = obj.estimatedDistance !== null ? `, approximately ${obj.estimatedDistance} meters` : '';

        if (obj.className.toLowerCase() === 'traffic light') {
          phrase = `Traffic light detected ${posText}.`;
        } else if (obj.className.toLowerCase() === 'stop sign') {
          phrase = `Stop sign detected ${posText}.`;
        } else {
          phrase = `${obj.className.charAt(0).toUpperCase() + obj.className.slice(1)} ${posText}${distText}.`;
        }

        audioManager.speak(phrase, 4, false);
        break; // Only one general announcement per cycle to avoid audio clutter
      }
    }

    // Clean up stale announcement entries
    if (this.lastAnnounced.size > 50) {
      const cutoff = now - 20000;
      for (const [k, v] of this.lastAnnounced.entries()) {
        if (v < cutoff) this.lastAnnounced.delete(k);
      }
    }
  }

  public clear() {
    this.lastAnnounced.clear();
  }
}

export const voiceAlertService = new VoiceAlertService();
