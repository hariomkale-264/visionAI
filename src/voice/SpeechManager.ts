import { PriorityLevel, SpokenQueueItem } from '../types';

type SpeechCallback = (message: string, priority: PriorityLevel) => void;

class SpeechManager {
  private queue: SpokenQueueItem[] = [];
  private isProcessing = false;
  private currentItem: SpokenQueueItem | null = null;
  private lastSpokenText = '';
  private lastSpokenTime = 0;
  private recentPhrases: Map<string, number> = new Map();
  private listeners: Set<SpeechCallback> = new Set();
  private keepAliveInterval: any = null;
  private currentLanguage = 'en-US';

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Voices ready
      };
    }
  }

  public setLanguage(lang: string) {
    this.currentLanguage = lang;
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  public subscribe(callback: SpeechCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(message: string, priority: PriorityLevel) {
    this.listeners.forEach((cb) => {
      try {
        cb(message, priority);
      } catch (e) {
        console.error('Speech callback error', e);
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

  public cancelAll() {
    this.queue = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isProcessing = false;
    this.currentItem = null;
  }

  public speak(
    text: string,
    priority: PriorityLevel = 4,
    forceImmediate = false
  ) {
    if (!text || !text.trim()) return;

    const cleanText = text.trim();
    const now = Date.now();

    // Spam / Cooldown logic: do not repeat exact phrase within 7 seconds unless it's Level 1 (Critical) or user-forced
    if (priority > 1 && !forceImmediate) {
      const lastTime = this.recentPhrases.get(cleanText.toLowerCase());
      if (lastTime && now - lastTime < 7000) {
        return; // Suppress duplicate repetition
      }
    }
    this.recentPhrases.set(cleanText.toLowerCase(), now);

    // Clean old entries
    if (this.recentPhrases.size > 50) {
      const cutoff = now - 15000;
      for (const [k, v] of this.recentPhrases.entries()) {
        if (v < cutoff) this.recentPhrases.delete(k);
      }
    }

    const item: SpokenQueueItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: cleanText,
      priority,
      timestamp: now,
      interruptCurrent: priority === 1 || forceImmediate,
    };

    // If Level 1 (Critical) or forceImmediate, interrupt currently playing speech immediately
    if (item.interruptCurrent) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      // Insert at front of queue
      this.queue.unshift(item);
      this.isProcessing = false;
      this.processQueue();
      return;
    }

    // Insert sorted by priority (1 is highest, 6 is lowest)
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (item.priority < this.queue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    this.queue.splice(insertIndex, 0, item);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      this.currentItem = null;
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift()!;
    this.currentItem = item;
    this.lastSpokenText = item.text;
    this.lastSpokenTime = Date.now();
    this.notify(item.text, item.priority);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not supported on this device');
      this.isProcessing = false;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate = 1.05; // Slightly brisk for responsive navigation
    utterance.pitch = item.priority === 1 ? 1.15 : 1.0;
    utterance.lang = this.currentLanguage;

    // Best voice selection matching target language
    const langPrefix = this.currentLanguage.split('-')[0].toLowerCase();
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.toLowerCase() === this.currentLanguage.toLowerCase() ||
        v.lang.toLowerCase().startsWith(langPrefix)
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      this.currentItem = null;
      // Short pause between announcements
      setTimeout(() => {
        this.processQueue();
      }, 150);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      this.currentItem = null;
      this.processQueue();
    };

    // Chrome mobile bug: speech synthesis can pause if long; keep it active
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
      console.error('Failed to execute speak:', err);
      this.processQueue();
    }
  }
}

export const speechManager = new SpeechManager();
