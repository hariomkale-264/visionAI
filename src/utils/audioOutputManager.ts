import { speechManager } from '../voice/SpeechManager';

type AudioCallback = (status: 'connected' | 'disconnected') => void;

class AudioOutputManager {
  private status: 'connected' | 'disconnected' = 'disconnected';
  private listeners: Set<AudioCallback> = new Set();
  private wasConnected = false;

  constructor() {
    this.checkAudioDevices();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.checkAudioDevices();
      });
    }
  }

  public subscribe(callback: AudioCallback) {
    this.listeners.add(callback);
    callback(this.status);
    return () => this.listeners.delete(callback);
  }

  private setStatus(s: 'connected' | 'disconnected') {
    const prev = this.status;
    this.status = s;
    if (prev !== s) {
      this.listeners.forEach((cb) => cb(s));
      if (prev === 'connected' && s === 'disconnected' && this.wasConnected) {
        speechManager.speak('Bluetooth audio disconnected.', 2, true);
      }
      if (s === 'connected') {
        this.wasConnected = true;
      }
    }
  }

  public async checkAudioDevices() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      this.setStatus('disconnected');
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasBluetoothOrHeadset = devices.some((d) => {
        const label = (d.label || '').toLowerCase();
        return (
          label.includes('bluetooth') ||
          label.includes('headset') ||
          label.includes('airpods') ||
          label.includes('buds') ||
          label.includes('wireless') ||
          label.includes('headphones')
        );
      });

      this.setStatus(hasBluetoothOrHeadset ? 'connected' : 'disconnected');
    } catch (e) {
      console.warn('Could not enumerate audio devices:', e);
      this.setStatus('disconnected');
    }
  }

  public getStatus() {
    return this.status;
  }
}

export const audioOutputManager = new AudioOutputManager();
