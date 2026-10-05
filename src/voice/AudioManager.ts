import { PriorityLevel, SpokenQueueItem } from '../types';

type SpeechListener = (message: string, priority: PriorityLevel) => void;
type SpeechStateListener = (isSpeaking: boolean) => void;

class AudioManager {
  private queue: SpokenQueueItem[] = [];
  private isSpeaking = false;
  private currentItem: SpokenQueueItem | null = null;
  private lastSpokenText = '';
  private lastSpokenTime = 0;
  private speechRate = 0.95;
  private currentLanguage = 'en-IN';
  private recentPhrases: Map<string, number> = new Map();
  private speechListeners: Set<SpeechListener> = new Set();
  private stateListeners: Set<SpeechStateListener> = new Set();
  private keepAliveInterval: any = null;
  private onSpeakingStartCallback: (() => void) | null = null;
  private onSpeakingEndCallback: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Warm up voices
      window.speechSynthesis.onvoiceschanged = () => {
        // voices loaded
      };
    }
  }

  public registerRecognitionInterlock(onStart: () => void, onEnd: () => void) {
    this.onSpeakingStartCallback = onStart;
    this.onSpeakingEndCallback = onEnd;
  }

  public setLanguage(lang: string) {
    this.currentLanguage = lang;
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  public setRate(rate: number) {
    this.speechRate = Math.max(0.6, Math.min(1.8, rate));
  }

  public getRate(): number {
    return this.speechRate;
  }

  public subscribe(callback: SpeechListener) {
    this.speechListeners.add(callback);
    return () => this.speechListeners.delete(callback);
  }

  public onSpeakingChange(callback: SpeechStateListener) {
    this.stateListeners.add(callback);
    callback(this.isSpeaking);
    return () => this.stateListeners.delete(callback);
  }

  private notifySpeech(message: string, priority: PriorityLevel) {
    this.speechListeners.forEach((cb) => {
      try {
        cb(message, priority);
      } catch (e) {
        console.error('Speech callback error', e);
      }
    });
  }

  private notifyState(isSpeaking: boolean) {
    this.isSpeaking = isSpeaking;
    this.stateListeners.forEach((cb) => {
      try {
        cb(isSpeaking);
      } catch (e) {
        console.error('Speech state error', e);
      }
    });
  }

  public getLastMessage(): string {
    return this.lastSpokenText;
  }

  public repeatLastMessage() {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText, 4, true);
    } else {
      this.speak('There is no previous message to repeat.', 4, true);
    }
  }

  public stop() {
    this.clearQueue();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.notifyState(false);
    this.currentItem = null;
    if (this.onSpeakingEndCallback) {
      this.onSpeakingEndCallback();
    }
  }

  public cancel() {
    this.stop();
  }

  public clearQueue() {
    this.queue = [];
  }

  public preventDuplicate(text: string, priority: PriorityLevel, cooldownMs: number): boolean {
    const key = text.trim().toLowerCase();
    const now = Date.now();
    const lastTime = this.recentPhrases.get(key);

    if (lastTime && now - lastTime < cooldownMs) {
      return true; // Is duplicate within cooldown
    }
    this.recentPhrases.set(key, now);

    // Prune stale cache entries
    if (this.recentPhrases.size > 80) {
      const cutoff = now - 30000;
      for (const [k, v] of this.recentPhrases.entries()) {
        if (v < cutoff) this.recentPhrases.delete(k);
      }
    }
    return false;
  }

  public interrupt(text: string, priority: PriorityLevel = 1) {
    this.speak(text, priority, true);
  }

  public speak(text: string, priority: PriorityLevel = 4, forceImmediate = false) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    const now = Date.now();

    // Priority-based cooldowns:
    // Priority 1 (Critical): 2s cooldown (dedup only immediate duplicate frame spam)
    // Priority 2 (High Obstacle): 3s cooldown
    // Priority 3 (Navigation): 4s cooldown
    // Priority 4-7: 5s cooldown unless user-forced
    let cooldownMs = 5000;
    if (priority === 1) cooldownMs = 2000;
    else if (priority === 2) cooldownMs = 3000;
    else if (priority === 3) cooldownMs = 4000;

    if (!forceImmediate && this.preventDuplicate(cleanText, priority, cooldownMs)) {
      return; // Deduplicated
    }

    const item: SpokenQueueItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: cleanText,
      priority,
      timestamp: now,
      interruptCurrent: priority === 1 || forceImmediate,
    };

    // If Critical (Priority 1) or forceImmediate, immediately abort current lower priority speech
    if (item.interruptCurrent) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.queue.unshift(item);
      this.processQueue();
      return;
    }

    // Insert sorted by priority (1 is highest, 7 is lowest)
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (item.priority < this.queue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    this.queue.splice(insertIndex, 0, item);

    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length === 0) {
      this.notifyState(false);
      this.currentItem = null;
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
      if (this.onSpeakingEndCallback) {
        this.onSpeakingEndCallback();
      }
      return;
    }

    const item = this.queue.shift()!;
    this.currentItem = item;
    this.lastSpokenText = item.text;
    this.lastSpokenTime = Date.now();

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not available');
      return;
    }

    // Interlock: pause SpeechRecognition so mic doesn't catch own voice & prevent Android chime loop
    if (this.onSpeakingStartCallback) {
      this.onSpeakingStartCallback();
    }
    this.notifyState(true);
    this.notifySpeech(item.text, item.priority);

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate = this.speechRate;
    utterance.pitch = item.priority === 1 ? 1.15 : 1.0;
    utterance.lang = this.currentLanguage;

    // Pick best matched installed voice
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = this.currentLanguage.split('-')[0].toLowerCase();
    const match =
      voices.find((v) => v.lang.toLowerCase() === this.currentLanguage.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    if (match) {
      utterance.voice = match;
    }

    utterance.onend = () => {
      this.currentItem = null;
      // Delay before next utterance to ensure clear cadence
      setTimeout(() => {
        this.processQueue();
      }, 180);
    };

    utterance.onerror = (e) => {
      console.warn('Speech utterance ended with error:', e);
      this.currentItem = null;
      setTimeout(() => {
        this.processQueue();
      }, 150);
    };

    // Chrome mobile bug: keep-alive for speech synthesis
    if (!this.keepAliveInterval) {
      this.keepAliveInterval = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    }

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech speak failed:', err);
      this.processQueue();
    }
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const audioManager = new AudioManager();
export const speechManager = audioManager; // Backward compatibility alias
