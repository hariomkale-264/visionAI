type CameraStatusCallback = (status: 'connected' | 'disconnected' | 'denied' | 'requesting') => void;

class CameraManager {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private currentFacingMode: 'environment' | 'user' = 'environment';
  private status: 'connected' | 'disconnected' | 'denied' | 'requesting' = 'disconnected';
  private statusListeners: Set<CameraStatusCallback> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvasElement = document.createElement('canvas');
    }
  }

  public attachVideoElement(video: HTMLVideoElement) {
    this.videoElement = video;
    if (this.stream && this.videoElement) {
      this.videoElement.srcObject = this.stream;
      this.videoElement.play().catch(console.warn);
    }
  }

  public getStatus() {
    return this.status;
  }

  public onStatusChange(callback: CameraStatusCallback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private setStatus(s: 'connected' | 'disconnected' | 'denied' | 'requesting') {
    this.status = s;
    this.statusListeners.forEach((cb) => cb(s));
  }

  public async start(facingMode: 'environment' | 'user' = 'environment'): Promise<boolean> {
    this.currentFacingMode = facingMode;
    this.setStatus('requesting');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('Camera API (getUserMedia) not supported in this browser');
      this.setStatus('disconnected');
      return false;
    }

    try {
      // First try rear camera specifically
      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        // Fallback to basic video constraint if exact facingMode failed
        console.warn('Ideal facingMode failed, falling back to basic video constraint:', err);
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play().catch(console.warn);
      }

      // Track stream end / disconnect
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.setStatus('disconnected');
        };
      }

      this.setStatus('connected');
      return true;
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.setStatus('denied');
      } else {
        this.setStatus('disconnected');
      }
      return false;
    }
  }

  public stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.setStatus('disconnected');
  }

  public async toggleCamera(): Promise<boolean> {
    const nextFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    this.stop();
    return this.start(nextFacingMode);
  }

  public captureFrame(maxWidth = 800, quality = 0.75): string | null {
    if (!this.videoElement || this.status !== 'connected') {
      return null;
    }

    const video = this.videoElement;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    if (!this.canvasElement) {
      this.canvasElement = document.createElement('canvas');
    }

    const canvas = this.canvasElement;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  public isConnected(): boolean {
    return this.status === 'connected' && !!this.stream;
  }
}

export const cameraManager = new CameraManager();
