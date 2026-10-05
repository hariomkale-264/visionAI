import React from 'react';
import { DetectionResult } from '../types/detection';
import { distanceEstimator } from '../services/distanceEstimation';

interface DetectionBoxProps {
  detection: DetectionResult;
}

export const DetectionBox: React.FC<DetectionBoxProps> = ({ detection }) => {
  const emoji = distanceEstimator.getClassEmoji(detection.className);
  const isVeryClose = detection.proximity === 'very-close';

  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-2.5 transition-all text-xs font-semibold ${
        isVeryClose
          ? 'border-red-400 bg-red-50 text-red-950 animate-pulse'
          : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base flex-shrink-0" aria-hidden="true">
          {emoji}
        </span>
        <div className="truncate">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-neutral-900 capitalize truncate">
              {detection.className}
            </span>
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: detection.color }}
              title={`Class color ${detection.className}`}
            />
          </div>
          <div className="text-[11px] text-neutral-500">
            Confidence: {Math.round(detection.confidence * 100)}%
          </div>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-xs font-bold text-neutral-900">
          {detection.estimatedDistance !== null
            ? `Estimated: ${detection.estimatedDistance} m`
            : 'Distance N/A'}
        </div>
        <div className="flex items-center justify-end gap-1 text-[11px] uppercase tracking-wide">
          <span
            className={`font-bold ${
              isVeryClose
                ? 'text-red-600'
                : detection.proximity === 'close'
                ? 'text-amber-600'
                : 'text-neutral-500'
            }`}
          >
            {detection.proximity.replace('-', ' ')}
          </span>
          <span className="text-neutral-400">•</span>
          <span className="text-neutral-600 capitalize">{detection.position}</span>
        </div>
      </div>
    </div>
  );
};
