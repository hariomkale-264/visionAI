import React, { useEffect, useRef } from 'react';
import { Camera, SwitchCamera, AlertTriangle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { cameraManager } from '../camera/CameraManager';
import { DetectedObject } from '../types';

interface CameraFeedProps {
  cameraStatus: 'connected' | 'disconnected' | 'denied' | 'requesting';
  detectedObjects: DetectedObject[];
  onStartCamera: () => void;
  isAssistanceActive: boolean;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  cameraStatus,
  detectedObjects,
  onStartCamera,
  isAssistanceActive,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      cameraManager.attachVideoElement(videoRef.current);
    }
  }, [cameraStatus]);

  const handleToggleCamera = async () => {
    await cameraManager.toggleCamera();
  };

  // Find most urgent object
  const criticalObject = detectedObjects.find((o) => o.priorityLevel === 1);
  const pathObstacle = detectedObjects.find((o) => o.inWalkingPath);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-neutral-900 bg-neutral-950 aspect-[4/3] sm:aspect-[16/10] shadow-sm">
      {/* Live Video Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-label="Physical smartphone rear camera feed for obstacle detection"
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          cameraStatus === 'connected' ? 'opacity-100' : 'opacity-20'
        }`}
      />

      {/* Camera Off / Disconnected State */}
      {cameraStatus !== 'connected' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-black/80">
          <div className="rounded-full bg-neutral-800 p-4 mb-3 border border-neutral-700">
            {cameraStatus === 'denied' ? (
              <EyeOff className="h-8 w-8 text-red-400" />
            ) : (
              <Camera className="h-8 w-8 text-neutral-400" />
            )}
          </div>

          <h3 className="text-base font-bold text-white mb-1">
            {cameraStatus === 'denied'
              ? 'Camera Permission Denied'
              : cameraStatus === 'requesting'
              ? 'Requesting Camera Access...'
              : 'Physical Camera Disconnected'}
          </h3>

          <p className="max-w-xs text-xs text-neutral-300 mb-4 leading-relaxed">
            {cameraStatus === 'denied'
              ? 'Please grant camera access in your browser site permissions to detect obstacles and read text.'
              : 'The smartphone rear camera is required for real-time obstacle and danger detection.'}
          </p>

          <button
            onClick={onStartCamera}
            className="flex items-center gap-2 rounded-xl bg-white text-neutral-900 px-5 py-2.5 text-sm font-bold shadow-lg hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-white focus:outline-none"
          >
            <Camera className="h-4 w-4" />
            <span>Enable Rear Camera</span>
          </button>
        </div>
      )}

      {/* Overlay when Camera Connected */}
      {cameraStatus === 'connected' && (
        <>
          {/* Top Bar on Camera View: Status and Camera Switch */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-white text-[11px] font-bold border border-white/10">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>REAR CAMERA LIVE</span>
            </div>

            <button
              onClick={handleToggleCamera}
              aria-label="Switch between rear and front camera"
              className="pointer-events-auto flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-white text-[11px] font-semibold border border-white/20 hover:bg-black/80 transition active:scale-95"
            >
              <SwitchCamera className="h-3.5 w-3.5" />
              <span>Switch</span>
            </button>
          </div>

          {/* Center Forward Walking Path Guide Indicator */}
          <div className="absolute inset-y-12 left-1/4 right-1/4 pointer-events-none border-x border-dashed border-white/30 flex items-center justify-center">
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest text-center px-1 py-0.5 rounded bg-black/30">
              Forward Walking Corridor
            </div>
          </div>

          {/* Level 1 Critical Warning Alert Banner */}
          {criticalObject && (
            <div
              role="alert"
              aria-live="assertive"
              className="absolute top-12 left-3 right-3 rounded-xl bg-red-600/95 text-white p-3 shadow-2xl border-2 border-white flex items-center gap-3 animate-bounce"
            >
              <AlertTriangle className="h-6 w-6 flex-shrink-0 text-white" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black uppercase tracking-wider text-red-100">
                  CRITICAL WARNING
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
              className="absolute top-12 left-3 right-3 rounded-xl bg-amber-500/95 text-white px-3 py-2 shadow-xl border border-amber-300 flex items-center gap-2"
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-white" />
              <div className="flex-1 min-w-0 text-xs font-bold leading-tight truncate">
                Obstacle in path: {pathObstacle.name} ({pathObstacle.distance})
              </div>
            </div>
          )}

          {/* Bottom Bar: Detected Objects Badges */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1.5 pointer-events-none">
            {detectedObjects.length > 0 ? (
              detectedObjects.slice(0, 3).map((obj, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold shadow-md border ${
                    obj.priorityLevel === 1
                      ? 'bg-red-600 text-white border-white'
                      : obj.priorityLevel === 2
                      ? 'bg-amber-600 text-white border-amber-400'
                      : 'bg-black/75 backdrop-blur-md text-white border-white/20'
                  }`}
                >
                  <Eye className="h-3 w-3 flex-shrink-0" />
                  <span>
                    {obj.name}: {obj.distance} ({obj.direction})
                  </span>
                </div>
              ))
            ) : isAssistanceActive ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-emerald-400 text-xs font-semibold border border-white/10">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Path Clear</span>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};
