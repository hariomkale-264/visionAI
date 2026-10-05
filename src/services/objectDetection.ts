import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { BoundingBox, DetectionResult } from '../types/detection';
import { distanceEstimator } from './distanceEstimation';

export class ObjectDetectionService {
  private model: cocoSsd.ObjectDetection | null = null;
  private isLoading = false;
  private isLoaded = false;
  private loadError: string | null = null;
  private trackingCounters: Map<string, number> = new Map();

  /**
   * Initializes TensorFlow.js and loads the COCO-SSD object detection model
   */
  public async loadModel(): Promise<boolean> {
    if (this.isLoaded && this.model) return true;
    if (this.isLoading) return false;

    this.isLoading = true;
    this.loadError = null;

    try {
      // Ensure TensorFlow.js backend is initialized (prefers WebGL for GPU acceleration)
      await tf.ready();
      
      // Load COCO-SSD model (lite_mobilenet_v2 or mobilenet_v2)
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2', // High-speed real-time execution in browser
      });

      this.isLoaded = true;
      this.isLoading = false;
      return true;
    } catch (err: any) {
      console.warn('Failed to load COCO-SSD model locally, attempting standard load:', err.message);
      try {
        this.model = await cocoSsd.load();
        this.isLoaded = true;
        this.isLoading = false;
        return true;
      } catch (fallbackErr: any) {
        this.loadError = fallbackErr.message || 'Model loading failed';
        this.isLoading = false;
        return false;
      }
    }
  }

  public isModelReady(): boolean {
    return this.isLoaded && this.model !== null;
  }

  public getLoadError(): string | null {
    return this.loadError;
  }

  public isModelLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Detects objects in a live video element or canvas
   */
  public async detect(
    source: HTMLVideoElement | HTMLCanvasElement,
    confidenceThreshold = 0.5,
    enableDistance = true
  ): Promise<DetectionResult[]> {
    if (!this.model) {
      const ready = await this.loadModel();
      if (!ready || !this.model) return [];
    }

    // Source dimension verification
    const width = 'videoWidth' in source ? source.videoWidth : source.width;
    const height = 'videoHeight' in source ? source.videoHeight : source.height;

    if (!width || !height || width === 0 || height === 0) {
      return [];
    }

    try {
      // Run inference directly in the browser via WebGL / WebAssembly
      const predictions = await this.model.detect(source, 10, confidenceThreshold);
      const now = Date.now();

      const results: DetectionResult[] = [];

      for (let i = 0; i < predictions.length; i++) {
        const pred = predictions[i];
        if (pred.score < confidenceThreshold) continue;

        // Bounding box format in COCO-SSD is [x, y, width, height]
        const [x, y, w, h] = pred.bbox;

        // Clamp to frame dimensions
        const clampedBox: BoundingBox = {
          x: Math.max(0, Math.round(x)),
          y: Math.max(0, Math.round(y)),
          width: Math.min(width - Math.max(0, x), Math.round(w)),
          height: Math.min(height - Math.max(0, y), Math.round(h)),
        };

        if (clampedBox.width < 10 || clampedBox.height < 10) continue;

        const className = pred.class;
        const estimatedDistance = enableDistance
          ? distanceEstimator.estimateDistance(className, clampedBox, width, height)
          : null;

        const proximity = distanceEstimator.getProximity(estimatedDistance);
        const position = distanceEstimator.getPosition(clampedBox, width);
        const color = distanceEstimator.getCategoryColor(className);

        // Tracking ID
        let count = this.trackingCounters.get(className) || 0;
        count = (count + 1) % 99;
        this.trackingCounters.set(className, count);
        const id = `${className}_${count}_${i}`;

        results.push({
          id,
          className,
          confidence: Math.round(pred.score * 100) / 100,
          boundingBox: clampedBox,
          estimatedDistance,
          position,
          proximity,
          color,
          timestamp: now,
          isHazard: proximity === 'very-close',
        });
      }

      return results;
    } catch (err: any) {
      console.warn('Inference error during frame detection:', err.message);
      return [];
    }
  }

  public dispose() {
    if (this.model) {
      this.model = null;
      this.isLoaded = false;
    }
  }
}

export const objectDetectionService = new ObjectDetectionService();
