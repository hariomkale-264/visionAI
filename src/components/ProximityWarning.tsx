import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { DetectionResult } from '../types/detection';

interface ProximityWarningProps {
  detections: DetectionResult[];
}

export const ProximityWarning: React.FC<ProximityWarningProps> = ({ detections }) => {
  const dangerousObjects = detections.filter((d) => d.proximity === 'very-close');

  if (dangerousObjects.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-2xl border-2 border-red-500 bg-red-600/95 text-white p-3 shadow-xl backdrop-blur-md animate-bounce"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-white/20 p-2 flex-shrink-0">
          <AlertTriangle className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-black uppercase tracking-wider text-red-200">
            PROXIMITY WARNING • OBSTACLE VERY CLOSE
          </div>
          <div className="text-sm font-black truncate">
            {dangerousObjects.map((d) => (
              <span key={d.id} className="mr-3 inline-block">
                ⚠ {d.className.toUpperCase()} • Estimated: {d.estimatedDistance} m ({d.position})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
