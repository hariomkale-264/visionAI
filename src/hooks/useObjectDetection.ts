import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DetectionResult,
  DetectionHistoryItem,
  DetectionSettingsConfig,
  DEFAULT_DETECTION_SETTINGS,
} from '../types/detection';
import { objectDetectionService } from '../services/objectDetection';
import { voiceAlertService } from '../services/voiceAlert';

interface UseObjectDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraStatus: 'connected' | 'disconnected' | 'denied' | 'requesting';
  initialSettings?: Partial<DetectionSettingsConfig>;
}

export function useObjectDetection({
  videoRef,
  cameraStatus,
  initialSettings,
}: UseObjectDetectionProps) {
  const [settings, setSettings] = useState<DetectionSettingsConfig>({
    ...DEFAULT_DETECTION_SETTINGS,
    ...initialSettings,
  });

  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [detectionHistory, setDetectionHistory] = useState<DetectionHistoryItem[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  const isProcessingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const fpsFrameCountRef = useRef(0);
  const fpsLastCalculatedRef = useRef(Date.now());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Initialize and load the model
  useEffect(() => {
    let isMounted = true;

    async function initModel() {
      setIsModelLoading(true);
      const success = await objectDetectionService.loadModel();
      if (!isMounted) return;

      if (success) {
        setIsModelLoaded(true);
        setModelError(null);
      } else {
        setModelError(objectDetectionService.getLoadError() || 'Could not load detection model.');
      }
      setIsModelLoading(false);
    }

    initModel();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update voice alert service configuration
  useEffect(() => {
    voiceAlertService.setEnabled(settings.voiceAnnouncements);
    voiceAlertService.setDangerAlertsEnabled(settings.dangerAlerts);
  }, [settings.voiceAnnouncements, settings.dangerAlerts]);

  // Main real-time detection loop
  useEffect(() => {
    if (!settings.enabled || cameraStatus !== 'connected' || !isModelLoaded) {
      setDetections([]);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let isRunning = true;
    const intervalMs = 1000 / settings.targetFps;

    const detectLoop = async (timestamp: number) => {
      if (!isRunning) return;

      const video = videoRef.current;
      const elapsed = timestamp - lastFrameTimeRef.current;

      // Throttle detection to target FPS
      if (elapsed >= intervalMs && video && video.readyState >= 2 && !isProcessingRef.current) {
        lastFrameTimeRef.current = timestamp;
        isProcessingRef.current = true;

        try {
          const results = await objectDetectionService.detect(
            video,
            settingsRef.current.confidenceThreshold,
            settingsRef.current.distanceEstimation
          );

          if (isRunning) {
            setDetections(results);

            // Announce voice alerts if configured
            if (settingsRef.current.voiceAnnouncements) {
              voiceAlertService.announceDetections(results);
            }

            // Update real-time history
            if (results.length > 0) {
              setDetectionHistory((prev) => {
                const newItems: DetectionHistoryItem[] = results.map((r) => ({
                  id: r.id + '_' + Date.now(),
                  className: r.className,
                  confidence: r.confidence,
                  estimatedDistance: r.estimatedDistance,
                  position: r.position,
                  proximity: r.proximity,
                  timestamp: Date.now(),
                  color: r.color,
                }));

                const combined = [...newItems, ...prev];
                // Keep the 25 most recent unique detections
                return combined.slice(0, 25);
              });
            }

            // Calculate FPS
            fpsFrameCountRef.current++;
            const now = Date.now();
            if (now - fpsLastCalculatedRef.current >= 1000) {
              setFps(fpsFrameCountRef.current);
              fpsFrameCountRef.current = 0;
              fpsLastCalculatedRef.current = now;
            }
          }
        } catch (err) {
          console.warn('Detection cycle error:', err);
        } finally {
          isProcessingRef.current = false;
        }
      }

      if (isRunning) {
        animationFrameRef.current = requestAnimationFrame(detectLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(detectLoop);

    return () => {
      isRunning = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [settings.enabled, settings.targetFps, cameraStatus, isModelLoaded, videoRef]);

  // Object counts summary
  const objectCounts = detections.reduce((acc, curr) => {
    acc[curr.className] = (acc[curr.className] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const updateSettings = useCallback((newSettings: Partial<DetectionSettingsConfig>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const clearHistory = useCallback(() => {
    setDetectionHistory([]);
  }, []);

  return {
    detections,
    detectionHistory,
    settings,
    fps,
    isModelLoaded,
    isModelLoading,
    modelError,
    objectCounts,
    updateSettings,
    clearHistory,
  };
}
