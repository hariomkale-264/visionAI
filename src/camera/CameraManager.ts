type CameraStatusCallback = (status: 'connected' | 'disconnected' | 'denied' | 'requesting') => void;
type DeviceChangeCallback = (facingMode: 'environment' | 'user', label: string) => void;

class CameraManager {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private currentFacingMode: 'environment' | 'user' = 'environment';
  private currentLabel = 'Rear Camera';
  private status: 'connected' | 'disconnected' | 'denied' | 'requesting' = 'disconnected';
  private isSimulatedFeed = false;
  private simulationAnimationId: number | null = null;
  private statusListeners: Set<CameraStatusCallback> = new Set();
  private deviceListeners: Set<DeviceChangeCallback> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvasElement = document.createElement('canvas');
    }
  }

  public attachVideoElement(video: HTMLVideoElement) {
    this.videoElement = video;
    if (this.stream && this.videoElement) {
      this.videoElement.srcObject = this.stream;
      this.videoElement.play().catch(() => {});
    }
  }

  public getStatus() {
    return this.status;
  }

  public getFacingMode(): 'environment' | 'user' {
    return this.currentFacingMode;
  }

  public getLabel(): string {
    return this.currentLabel;
  }

  public isSimulated(): boolean {
    return this.isSimulatedFeed;
  }

  public onStatusChange(callback: CameraStatusCallback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public onDeviceChange(callback: DeviceChangeCallback) {
    this.deviceListeners.add(callback);
    callback(this.currentFacingMode, this.currentLabel);
    return () => {
      this.deviceListeners.delete(callback);
    };
  }

  private setStatus(s: 'connected' | 'disconnected' | 'denied' | 'requesting') {
    this.status = s;
    this.statusListeners.forEach((cb) => cb(s));
  }

  private setDevice(facingMode: 'environment' | 'user', label: string) {
    this.currentFacingMode = facingMode;
    this.currentLabel = label;
    this.deviceListeners.forEach((cb) => cb(facingMode, label));
  }

  public async start(facingMode: 'environment' | 'user' = this.currentFacingMode): Promise<boolean> {
    this.stopSimulation();
    this.currentFacingMode = facingMode;
    this.setStatus('requesting');

    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera API (getUserMedia) not supported in this browser environment');
      this.setStatus('disconnected');
      return false;
    }

    // Stop existing stream if any
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    try {
      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (idealErr: any) {
        // If user actively denied or browser blocked, do not double-prompt
        if (idealErr.name === 'NotAllowedError' || idealErr.name === 'PermissionDeniedError') {
          throw idealErr;
        }

        console.warn('Ideal facingMode constraint failed, attempting general webcam access:', idealErr.message);
        // Fallback for laptop webcams without facingMode constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      this.stream = stream;
      this.isSimulatedFeed = false;

      const track = stream.getVideoTracks()[0];
      const trackLabel = track?.label || (facingMode === 'user' ? 'Laptop Webcam' : 'Rear Camera');
      this.setDevice(facingMode, trackLabel);

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play().catch(() => {});
      }

      if (track) {
        track.onended = () => {
          this.setStatus('disconnected');
        };
      }

      this.setStatus('connected');
      return true;
    } catch (err: any) {
      // Graceful handling of browser camera permission states
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        console.warn('Camera permission denied by user or browser policy.');
        this.setStatus('denied');
      } else {
        console.warn('Camera connection failed:', err.message || err.name);
        this.setStatus('disconnected');
      }
      return false;
    }
  }

  public stop() {
    this.stopSimulation();
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
    return this.start(nextFacingMode);
  }

  public async switchToLaptopCamera(): Promise<boolean> {
    return this.start('user');
  }

  public async switchToRearCamera(): Promise<boolean> {
    return this.start('environment');
  }

  /**
   * Simulated Test Feed for testing on laptops, simulators, or when camera permission is restricted
   */
  public startSimulation(): boolean {
    this.stop();

    if (typeof window === 'undefined') return false;

    const simCanvas = document.createElement('canvas');
    simCanvas.width = 640;
    simCanvas.height = 480;
    const ctx = simCanvas.getContext('2d');
    if (!ctx) return false;

    let frameCount = 0;
    const drawSimFrame = () => {
      frameCount++;
      const time = frameCount * 0.03;

      // Realistic outdoor street scene simulation
      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 240);
      skyGrad.addColorStop(0, '#60A5FA');
      skyGrad.addColorStop(1, '#BFDBFE');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 640, 240);

      // Ground / Sidewalk
      const groundGrad = ctx.createLinearGradient(0, 240, 0, 480);
      groundGrad.addColorStop(0, '#78716C');
      groundGrad.addColorStop(1, '#44403C');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 240, 640, 240);

      // Walking sidewalk lines
      ctx.strokeStyle = '#D6D3D1';
      ctx.lineWidth = 3;
      const walkOffset = (frameCount * 2) % 40;
      for (let y = 240 + walkOffset; y < 480; y += 40) {
        ctx.beginPath();
        ctx.moveTo(220 - (y - 240) * 0.5, y);
        ctx.lineTo(420 + (y - 240) * 0.5, y);
        ctx.stroke();
      }

      // Walking corridor bounds
      ctx.strokeStyle = '#F59E0B';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(240, 240);
      ctx.lineTo(160, 480);
      ctx.moveTo(400, 240);
      ctx.lineTo(480, 480);
      ctx.stroke();
      ctx.setLineDash([]);

      // Moving pedestrian ahead
      const pedX = 320 + Math.sin(time * 0.8) * 40;
      const pedY = 280 + Math.cos(time * 0.5) * 15;
      ctx.fillStyle = '#1E3A8A'; // Blue jacket
      ctx.fillRect(pedX - 16, pedY - 30, 32, 50);
      ctx.fillStyle = '#FBBF24'; // Head
      ctx.beginPath();
      ctx.arc(pedX, pedY - 42, 12, 0, Math.PI * 2);
      ctx.fill();

      // Parked car on right side
      ctx.fillStyle = '#DC2626'; // Red car
      ctx.fillRect(490, 260, 110, 45);
      ctx.fillStyle = '#111827'; // Wheels
      ctx.beginPath();
      ctx.arc(515, 305, 10, 0, Math.PI * 2);
      ctx.arc(575, 305, 10, 0, Math.PI * 2);
      ctx.fill();

      // Road sign / pole on left side
      ctx.fillStyle = '#71717A';
      ctx.fillRect(80, 200, 6, 120);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(68, 180, 30, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('STOP', 71, 196);

      // Watermark indicator
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 220, 28);
      ctx.fillStyle = '#34D399';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('• SIMULATED TEST FEED', 20, 28);

      this.simulationAnimationId = requestAnimationFrame(drawSimFrame);
    };

    drawSimFrame();

    // Capture canvas stream
    try {
      const stream = simCanvas.captureStream(24);
      this.stream = stream;
      this.isSimulatedFeed = true;
      this.setDevice('user', 'Simulated Walking Camera');

      if (this.videoElement) {
        this.videoElement.srcObject = stream;
        this.videoElement.play().catch(() => {});
      }

      this.setStatus('connected');
      return true;
    } catch (e) {
      console.warn('Failed to start canvas stream simulation:', e);
      return false;
    }
  }

  private stopSimulation() {
    if (this.simulationAnimationId !== null) {
      cancelAnimationFrame(this.simulationAnimationId);
      this.simulationAnimationId = null;
    }
    this.isSimulatedFeed = false;
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
