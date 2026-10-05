import React, { useState } from 'react';
import { Eye, Sliders, History, Sparkles, Activity } from 'lucide-react';
import { DetectionResult, DetectionHistoryItem, DetectionSettingsConfig } from '../types/detection';
import { DetectionBox } from './DetectionBox';
import { distanceEstimator } from '../services/distanceEstimation';

interface DetectionPanelProps {
  detections: DetectionResult[];
  history: DetectionHistoryItem[];
  objectCounts: Record<string, number>;
  fps: number;
  isModelLoaded: boolean;
  isModelLoading: boolean;
  modelError: string | null;
  settings: DetectionSettingsConfig;
  onOpenSettings: () => void;
  onClearHistory: () => void;
}

export const DetectionPanel: React.FC<DetectionPanelProps> = ({
  detections,
  history,
  objectCounts,
  fps,
  isModelLoaded,
  isModelLoading,
  modelError,
  settings,
  onOpenSettings,
  onClearHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');

  const totalCount = detections.length;

  return (
    <section
      aria-label="Real-Time AI Object Detections"
      className="rounded-3xl border-2 border-neutral-900 bg-white p-4 shadow-sm space-y-3.5"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neutral-900 text-white">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-neutral-900">
                Live AI Object Detection
              </h2>
              {isModelLoaded ? (
                <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {fps} FPS
                </span>
              ) : isModelLoading ? (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
                  Loading COCO-SSD Model...
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-neutral-500 font-semibold">
              On-device real-time inference with distance estimation
            </p>
          </div>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          aria-label="Open detection settings"
          title="Detection Settings"
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition active:scale-95"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Config</span>
        </button>
      </div>

      {/* Model error banner if any */}
      {modelError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 flex items-center justify-between">
          <span>Model notice: {modelError}</span>
          <span className="text-[10px] text-neutral-500">Using backup cloud engine</span>
        </div>
      )}

      {/* Real-Time Detection Counter Summary Bar (Requirement 10) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-neutral-50 border border-neutral-200 p-2.5 text-xs">
        <div className="flex items-center gap-2 font-bold text-neutral-900">
          <Activity className="h-4 w-4 text-blue-600" />
          <span>
            Objects detected: <strong className="text-sm font-black">{totalCount}</strong>
          </span>
        </div>

        {/* Breakdown by class badge */}
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(objectCounts).map(([cls, count]) => {
            const emoji = distanceEstimator.getClassEmoji(cls);
            return (
              <span
                key={cls}
                className="inline-flex items-center gap-1 rounded-lg bg-white border border-neutral-200 px-2 py-0.5 text-[11px] font-bold text-neutral-800 shadow-2xs"
              >
                <span>{emoji}</span>
                <span className="capitalize">{cls}:</span>
                <span className="text-blue-600 font-black">{count}</span>
              </span>
            );
          })}
          {totalCount === 0 && (
            <span className="text-[11px] font-semibold text-neutral-400">
              No objects in view
            </span>
          )}
        </div>
      </div>

      {/* View Switcher: Live Detections vs Recent History */}
      <div className="flex items-center justify-between pt-1">
        <div className="inline-flex rounded-xl bg-neutral-100 p-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
              activeTab === 'live'
                ? 'bg-white text-neutral-900 shadow-sm font-black'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Live Detections ({detections.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
              activeTab === 'history'
                ? 'bg-white text-neutral-900 shadow-sm font-black'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <History className="h-3.5 w-3.5 text-neutral-500" />
            <span>Recent History ({history.length})</span>
          </button>
        </div>

        {activeTab === 'history' && history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-[11px] font-semibold text-neutral-500 hover:text-red-600 transition"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Tab Content: Live Detections List (Requirement 9) */}
      {activeTab === 'live' && (
        <div className="space-y-2">
          {detections.length > 0 ? (
            detections.map((det) => <DetectionBox key={det.id} detection={det} />)
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-neutral-500">
              <Eye className="mx-auto h-7 w-7 text-neutral-400 mb-1.5 opacity-60" />
              <p className="text-xs font-semibold">
                {settings.enabled
                  ? 'Point camera at people, vehicles, signs, or objects to detect them in real time.'
                  : 'Detection is currently paused in settings.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Recent Detection History Table (Requirement 14) */}
      {activeTab === 'history' && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {history.length > 0 ? (
            history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50/70 p-2 text-xs font-medium"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm">{distanceEstimator.getClassEmoji(item.className)}</span>
                  <span className="font-bold text-neutral-900 capitalize truncate">{item.className}</span>
                  <span className="text-[11px] text-neutral-400">{Math.round(item.confidence * 100)}%</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="font-bold text-neutral-800">
                    {item.estimatedDistance !== null ? `${item.estimatedDistance}m` : 'N/A'}
                  </span>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                    {item.position}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-neutral-400 italic">
              No recent detections recorded yet.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
