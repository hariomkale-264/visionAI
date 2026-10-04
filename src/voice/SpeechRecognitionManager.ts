type RecognitionCallback = (text: string, isFinal: boolean) => void;
type StatusCallback = (status: 'ready' | 'listening' | 'disconnected' | 'denied' | 'requesting') => void;

class SpeechRecognitionManager {
  private recognition: any = null;
  private isListening = false;
  private status: 'ready' | 'listening' | 'disconnected' | 'denied' | 'requesting' = 'disconnected';
  private textListeners: Set<RecognitionCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private restartTimeout: any = null;
  private continuousMode = true;
  private currentLanguage = 'en-US';

  constructor() {
    this.init();
  }

  public setLanguage(lang: string) {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
      if (this.isListening) {
        this.stop();
        setTimeout(() => this.start(), 300);
      }
    }
  }

  public getLanguage() {
    return this.currentLanguage;
  }

  private init() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser environment');
      this.setStatus('disconnected');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.setStatus('listening');
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const text = (finalTranscript || interimTranscript).trim();
        const isFinal = Boolean(finalTranscript);

        if (text) {
          this.textListeners.forEach((cb) => cb(text, isFinal));
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.setStatus('denied');
        } else if (event.error === 'no-speech') {
          // Normal silence, restart if continuous
          this.scheduleRestart(500);
        } else {
          this.setStatus('ready');
          this.scheduleRestart(1000);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.status !== 'denied') {
          this.setStatus('ready');
        }
        if (this.continuousMode && this.status !== 'denied') {
          this.scheduleRestart(600);
        }
      };

      this.setStatus('ready');
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      this.setStatus('disconnected');
    }
  }

  private scheduleRestart(delayMs = 500) {
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      if (this.continuousMode && !this.isListening && this.status !== 'denied') {
        this.start();
      }
    }, delayMs);
  }

  private setStatus(s: 'ready' | 'listening' | 'disconnected' | 'denied' | 'requesting') {
    this.status = s;
    this.statusListeners.forEach((cb) => cb(s));
  }

  public getStatus() {
    return this.status;
  }

  public onStatusChange(callback: StatusCallback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  public onTranscript(callback: RecognitionCallback) {
    this.textListeners.add(callback);
    return () => this.textListeners.delete(callback);
  }

  public start() {
    if (!this.recognition) {
      this.init();
    }
    if (!this.recognition) return;

    this.continuousMode = true;
    try {
      this.recognition.start();
      this.setStatus('listening');
    } catch (e: any) {
      // Already started or starting
      if (e.name !== 'InvalidStateError') {
        console.warn('Recognition start caught error:', e);
      }
    }
  }

  public stop() {
    this.continuousMode = false;
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Recognition stop error:', e);
      }
    }
    this.isListening = false;
    this.setStatus('ready');
  }

  public isAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window))
    );
  }
}

export const speechRecognitionManager = new SpeechRecognitionManager();
