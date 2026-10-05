import React, { useEffect, useRef, useState } from 'react';
import { Camera, SwitchCamera, AlertTriangle, ShieldCheck, Eye, EyeOff, Laptop, Play, Info } from 'lucide-react';
import { cameraManager } from '../camera/CameraManager';
import { DetectedObject } from '../types';
import { DetectionResult, DetectionSettingsConfig } from '../types/detection';
import { ObjectDetectionOverlay } from './ObjectDetectionOverlay';

interface CameraFeedProps {
  cameraStatus: 'connected' | 'disconnected' | 'denied' | 'requesting';
  detectedObjects: DetectedObject[];
  onStartCamera: () => void;
  isAssistanceActive: boolean;
  showConfidence?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  realTimeDetections?: DetectionResult[];
  detectionSettings?: DetectionSettingsConfig;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  cameraStatus,
  detectedObjects,
  onStartCamera,
  isAssistanceActive,
  showConfidence = true,
  videoRef: externalVideoRef,
  realTimeDetections = [],
  detectionSettings,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const activeVideoRef = externalVideoRef || internalVideoRef;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setDeviceLabel] = useState<string>('Rear Camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    if (activeVideoRef.current) {
      cameraManager.attachVideoElement(activeVideoRef.current);
    }
  }, [cameraStatus, activeVideoRef]);

  useEffect(() => {
    const unsub = cameraManager.onDeviceChange((mode, label) => {
      setFacingMode(mode);
      setDeviceLabel(label);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleToggleCamera = async () => {
    await cameraManager.toggleCamera();
  };

  const handleStartSimulation = () => {
    cameraManager.startSimulation();
  };

  const criticalObject = detectedObjects.find((o) => o.priorityLevel === 1 || o.safetyLevel === 'critical');
  const pathObstacle = detectedObjects.find((o) => o.inWalkingPath);
  const isSimulated = cameraManager.isSimulated();

  const isRealTimeActive = detectionSettings ? detectionSettings.enabled : true;
  const hasRealTimeDetections = realTimeDetections.length > 0;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-neutral-900 bg-neutral-950 aspect-[4/3] sm:aspect-[16/10] shadow-sm">
      {/* Live Video Feed */}
      <video
        ref={activeVideoRef}
        playsInline
        muted
        autoPlay
        aria-label="Device camera feed for obstacle detection"
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          cameraStatus === 'connected' ? 'opacity-100' : 'opacity-20'
        }`}
      />

      {/* Real-time Browser-Native Object Detection Bounding Box Overlay (Matches Reference Image) */}
      {cameraStatus === 'connected' && isRealTimeActive && (
        <ObjectDetectionOverlay
          detections={realTimeDetections}
          videoRef={activeVideoRef}
          showDistance={detectionSettings?.distanceEstimation ?? true}
          showConfidence={showConfidence}
        />
      )}

      {/* Camera Off / Disconnected / Denied State */}
      {cameraStatus !== 'connected' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center text-white bg-black/85 z-20 overflow-y-auto">
          <div className="rounded-full bg-neutral-800 p-3 mb-2 border border-neutral-700">
            {cameraStatus === 'denied' ? (
              <EyeOff className="h-7 w-7 text-red-400" />
            ) : (
              <Camera className="h-7 w-7 text-neutral-400" />
            )}
          </div>

          <h3 className="text-sm sm:text-base font-bold text-white mb-1">
            {cameraStatus === 'denied'
              ? 'Camera Access Not Granted'
              : cameraStatus === 'requesting'
              ? 'Requesting Camera Access...'
              : 'Physical Camera Disconnected'}
          </h3>

          <p className="max-w-sm text-xs text-neutral-300 mb-3 leading-relaxed">
            {cameraStatus === 'denied'
              ? 'Browser blocked camera access. You can allow it in your browser settings or use the test simulation below to verify the project.'
              : 'Works with laptop webcams or smartphone rear cameras. Choose an option to start.'}
          </p>

          {cameraStatus === 'denied' && (
            <div className="mb-3 max-w-xs flex items-start gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 p-2 text-left text-[11px] text-amber-200">
              <Info className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5" />
              <span>
                To allow camera: Click the <strong>lock icon 🔒</strong> in your browser address bar &gt; set <strong>Camera</strong> to <strong>Allow</strong> &gt; then click <strong>Try Again</strong>.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
            <button
              onClick={onStartCamera}
              className="flex items-center justify-center gap-2 rounded-xl bg-white text-neutral-900 px-4 py-2 text-xs font-bold shadow-lg hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-white focus:outline-none"
            >
              <Camera className="h-4 w-4" />
              <span>{cameraStatus === 'denied' ? 'Try Again' : 'Enable Camera'}</span>
            </button>

            <button
              onClick={async () => {
                await cameraManager.switchToLaptopCamera();
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-bold hover:bg-blue-700 transition active:scale-95 shadow-md"
            >
              <Laptop className="h-4 w-4" />
              <span>Laptop Webcam</span>
            </button>

            <button
              onClick={handleStartSimulation}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700 transition active:scale-95 shadow-md"
            >
              <Play className="h-4 w-4" />
              <span>Use Test Simulated Feed</span>
            </button>
          </div>
        </div>
      )}

      {/* Overlay controls when Camera Connected */}
      {cameraStatus === 'connected' && (
        <>
          {/* Top Bar on Camera View: Live Status & Camera Switch */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
            <div className="flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-md px-2.5 py-1 text-white text-[11px] font-bold border border-white/10">
              <span className={`h-2 w-2 rounded-full ${isSimulated ? 'bg-amber-400' : 'bg-emerald-500'} animate-pulse`} />
              <span>
                {isSimulated
                  ? 'SIMULATED TEST FEED'
                  : facingMode === 'user'
                  ? 'LAPTOP WEBCAM LIVE'
                  : 'REAR CAMERA LIVE'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              {isSimulated ? (
                <button
                  onClick={onStartCamera}
                  className="flex items-center gap-1 rounded-lg bg-black/70 backdrop-blur-md px-2.5 py-1 text-white text-[11px] font-bold border border-white/20 hover:bg-black/90 transition active:scale-95 shadow-md"
                >
                  <Camera className="h-3.5 w-3.5 text-blue-400" />
                  <span>Switch to Real Camera</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleCamera}
                  aria-label={`Switch camera. Currently on ${facingMode === 'user' ? 'laptop webcam' : 'rear camera'}`}
                  className="flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-md px-2.5 py-1 text-white text-[11px] font-bold border border-white/20 hover:bg-black/90 transition active:scale-95 shadow-md"
                >
                  <SwitchCamera className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{facingMode === 'user' ? 'Switch to Rear' : 'Switch to Webcam'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Center Forward Walking Path Guide Corridor */}
          <div className="absolute inset-y-10 left-[30%] right-[30%] pointer-events-none border-x border-dashed border-white/25 flex items-end justify-center pb-2 z-0">
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider text-center px-1.5 py-0.5 rounded bg-black/40">
              Walking Corridor
            </div>
          </div>

          {/* Level 1 Critical Warning Alert Banner */}
          {criticalObject && (
            <div
              role="alert"
              aria-live="assertive"
              className="absolute top-12 left-3 right-3 rounded-xl bg-red-600 text-white p-3 shadow-2xl border-2 border-white flex items-center gap-3 animate-pulse z-20"
            >
              <AlertTriangle className="h-6 w-6 flex-shrink-0 text-white" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-black uppercase tracking-wider text-red-100">
                  CRITICAL SAFETY WARNING
                </div>
                <div className="text-sm font-bold leading-tight truncate">
                  {criticalObject.spokenAlert}
                </div>
              </div>
            </div>
          )}

          {/* Obstacle in Walking Path Banner (Level 2) */}
          {!criticalObject && pathObstacle && (
            <div
              role="alert"
              aria-live="polite"
              className="absolute top-12 left-3 right-3 rounded-xl bg-amber-500 text-white px-3 py-2 shadow-xl border border-amber-300 flex items-center gap-2 z-20"
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-white" />
              <div className="flex-1 min-w-0 text-xs font-bold leading-tight truncate">
                Obstacle in walking path: {pathObstacle.name} ({pathObstacle.distance})
              </div>
            </div>
          )}

          {/* Bottom Bar: Detected Objects Count / Path Clear Indicator */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
            {hasRealTimeDetections || detectedObjects.length > 0 ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-black/75 backdrop-blur-md px-2.5 py-1 text-white text-xs font-bold border border-white/20">
                <Eye className="h-3.5 w-3.5 text-blue-400" />
                <span>
                  {hasRealTimeDetections
                    ? `${realTimeDetections.length} objects detected in real time`
                    : `${detectedObjects.length} objects tracked`}
                </span>
              </div>
            ) : isAssistanceActive ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-md px-2.5 py-1 text-emerald-400 text-xs font-bold border border-white/10">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Walking Path Clear</span>
              </div>
            ) : null}

            {/* Danger color key hint */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] text-neutral-300 font-semibold border border-white/10">
              <span className="h-2 w-2 rounded-full bg-magenta-500" style={{ backgroundColor: '#E000B0' }} title="Person" />
              <span className="h-2 w-2 rounded-full bg-green-500" style={{ backgroundColor: '#00FF2A' }} title="Vehicle" />
              <span className="h-2 w-2 rounded-full bg-cyan-500" style={{ backgroundColor: '#00C5FF' }} title="Animal" />
              <span className="h-2 w-2 rounded-full bg-yellow-400" style={{ backgroundColor: '#FFF000' }} title="Traffic Light" />
              <span className="h-2 w-2 rounded-full bg-blue-500" style={{ backgroundColor: '#0044FF' }} title="Sign" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
