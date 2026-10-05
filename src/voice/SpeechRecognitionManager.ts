import { audioManager } from './AudioManager';

type RecognitionCallback = (text: string, isFinal: boolean) => void;
type StatusCallback = (status: 'ready' | 'listening' | 'disconnected' | 'denied' | 'requesting') => void;
export type VoiceSessionState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

class SpeechRecognitionManager {
  private recognition: any = null;
  private micStream: MediaStream | null = null;
  private isListening = false;
  private isStarting = false;
  private shouldKeepListening = false;
  private isAssistantRunning = false;
  private isPausedForTTS = false;
  private sessionState: VoiceSessionState = 'IDLE';
  private status: 'ready' | 'listening' | 'disconnected' | 'denied' | 'requesting' = 'disconnected';
  private textListeners: Set<RecognitionCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private stateListeners: Set<(state: VoiceSessionState) => void> = new Set();
  private restartTimeout: any = null;
  private currentLanguage = 'en-IN';
  private lastProcessedTimestamp = 0;

  constructor() {
    this.init();
    // Interlock with AudioManager to pause audio-processing during TTS so assistant does not hear its own voice
    audioManager.registerRecognitionInterlock(
      () => this.onTTSStart(),
      () => this.onTTSEnd()
    );
  }

  public setLanguage(lang: string) {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
      if (this.isListening && this.shouldKeepListening) {
        try {
          this.recognition.stop();
        } catch (e) {
          // ignore
        }
      }
    }
  }

  public getLanguage() {
    return this.currentLanguage;
  }

  public getSessionState(): VoiceSessionState {
    return this.sessionState;
  }

  public isContinuousListening(): boolean {
    return this.shouldKeepListening && (this.isListening || this.isStarting);
  }

  public onSessionStateChange(callback: (state: VoiceSessionState) => void) {
    this.stateListeners.add(callback);
    callback(this.sessionState);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  private setSessionState(state: VoiceSessionState) {
    this.sessionState = state;
    this.stateListeners.forEach((cb) => cb(state));
  }

  private onTTSStart() {
    this.isPausedForTTS = true;
    this.setSessionState('SPEAKING');
  }

  private onTTSEnd() {
    this.isPausedForTTS = false;
    // When TTS finishes, immediately keep listening if assistant is running
    if (this.shouldKeepListening) {
      this.setSessionState('LISTENING');
      if (!this.isListening && !this.isStarting) {
        this.scheduleRestart(100);
      }
    } else {
      this.setSessionState('IDLE');
    }
  }

  private init() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser');
      this.setStatus('disconnected');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      // Continuous = true: keeps listening across multiple sentences and commands
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.isStarting = false;
        this.setStatus('listening');
        if (!this.isPausedForTTS) {
          this.setSessionState('LISTENING');
        }
      };

      this.recognition.onresult = (event: any) => {
        // While TTS is actively playing, ignore transcript to prevent hearing own speech
        if (this.isPausedForTTS) return;

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
          const now = Date.now();
          if (isFinal) {
            this.setSessionState('PROCESSING');
            // Debounce identical duplicate triggers within 600ms
            if (now - this.lastProcessedTimestamp > 600) {
              this.lastProcessedTimestamp = now;
              this.textListeners.forEach((cb) => cb(text, true));
            }
            // Automatically return to listening state after dispatching command
            setTimeout(() => {
              if (this.shouldKeepListening && !this.isPausedForTTS) {
                this.setSessionState('LISTENING');
              }
            }, 300);
          } else {
            this.textListeners.forEach((cb) => cb(text, false));
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition event error:', event.error);
        const err = event.error;

        if (err === 'not-allowed' || err === 'service-not-allowed') {
          this.setStatus('denied');
          this.shouldKeepListening = false;
          this.isAssistantRunning = false;
          this.setSessionState('IDLE');
          audioManager.speak(
            'Microphone permission was denied. Please allow microphone access in your browser settings.',
            2,
            true
          );
          return;
        }

        // Recoverable silence / network / audio capture errors:
        // Do NOT stop listening! If shouldKeepListening is true, it will restart automatically via onend.
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.isStarting = false;

        // If user clicked Stop, stay stopped completely!
        if (!this.shouldKeepListening || !this.isAssistantRunning) {
          this.setStatus('ready');
          this.setSessionState('IDLE');
          return;
        }

        // If assistant is still active, automatically restart recognition!
        if (this.status !== 'denied') {
          this.setStatus('listening');
          this.scheduleRestart(150);
        }
      };

      this.setStatus('ready');
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      this.setStatus('disconnected');
    }
  }

  private scheduleRestart(delayMs = 150) {
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    if (!this.shouldKeepListening || !this.isAssistantRunning) return;

    this.restartTimeout = setTimeout(() => {
      if (this.shouldKeepListening && this.isAssistantRunning && !this.isListening && !this.isStarting) {
        this.startRecognitionInstance();
      }
    }, delayMs);
  }

  private async startRecognitionInstance() {
    if (!this.recognition) {
      this.init();
    }
    if (!this.recognition || this.isListening || this.isStarting) return;

    this.isStarting = true;
    try {
      this.recognition.lang = this.currentLanguage;
      this.recognition.start();
    } catch (e: any) {
      this.isStarting = false;
      // If already started, ignore error
      if (e.name !== 'InvalidStateError') {
        console.warn('Recognition start caught error:', e);
      }
    }
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
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public onTranscript(callback: RecognitionCallback) {
    this.textListeners.add(callback);
    return () => {
      this.textListeners.delete(callback);
    };
  }

  /**
   * Start continuous microphone listening when user clicks Start
   * Keeps listening continuously until Stop is explicitly clicked!
   */
  public async startContinuousListening(isAssistant = true): Promise<boolean> {
    this.shouldKeepListening = true;
    this.isAssistantRunning = isAssistant;
    this.setStatus('requesting');

    // Acquire audio stream to request mic permission and ensure track retention
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && !this.micStream) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (permErr: any) {
      console.warn('Microphone permission request failed:', permErr.message);
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        this.setStatus('denied');
        this.shouldKeepListening = false;
        this.isAssistantRunning = false;
        this.setSessionState('IDLE');
        audioManager.speak('Microphone access denied. Please grant microphone permissions.', 2, true);
        return false;
      }
    }

    this.setStatus('listening');
    this.setSessionState('LISTENING');
    await this.startRecognitionInstance();
    return true;
  }

  /**
   * Stop button is the ONLY action that stops the continuous microphone.
   * Stops recognition, stops all mic stream tracks, and prevents automatic restarts.
   */
  public stopContinuousListening() {
    this.shouldKeepListening = false;
    this.isAssistantRunning = false;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    // Stop all microphone MediaStream tracks
    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // ignore
      }
      this.micStream = null;
    }

    // Stop speech recognition instance
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        try {
          this.recognition.stop();
        } catch (e2) {
          // ignore
        }
      }
    }

    this.isListening = false;
    this.isStarting = false;
    this.setStatus('ready');
    this.setSessionState('IDLE');
  }

  // Compatibility aliases
  public startListening() {
    return this.startContinuousListening(true);
  }

  public stopListening() {
    this.stopContinuousListening();
  }

  public start() {
    return this.startContinuousListening(true);
  }

  public stop() {
    this.stopContinuousListening();
  }

  public toggleListening(): boolean {
    if (this.shouldKeepListening) {
      this.stopContinuousListening();
      return false;
    } else {
      this.startContinuousListening(true);
      return true;
    }
  }

  public isAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window))
    );
  }
}

export const speechRecognitionManager = new SpeechRecognitionManager();
