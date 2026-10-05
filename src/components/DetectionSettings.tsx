import React from 'react';
import { Sliders, Volume2, ShieldAlert, Activity, CheckCircle2 } from 'lucide-react';
import { DetectionSettingsConfig } from '../types/detection';

interface DetectionSettingsProps {
  settings: DetectionSettingsConfig;
  onUpdateSettings: (newSettings: Partial<DetectionSettingsConfig>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const DetectionSettings: React.FC<DetectionSettingsProps> = ({
  settings,
  onUpdateSettings,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detection-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md rounded-3xl border-2 border-neutral-900 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-neutral-900 text-white">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 id="detection-settings-title" className="text-base font-black text-neutral-900">
                Object Detection Settings
              </h2>
              <p className="text-[11px] text-neutral-500 font-semibold">
                Configure real-time in-browser model behavior
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          {/* 1. Detection ON / OFF */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-neutral-200 bg-neutral-50">
            <div>
              <div className="text-xs font-bold text-neutral-900">Real-Time Detection</div>
              <div className="text-[11px] text-neutral-500">Run continuous detection on incoming camera frames</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
              role="switch"
              aria-checked={settings.enabled}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.enabled ? 'bg-neutral-900' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 2. Confidence Threshold */}
          <div className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-neutral-900">Confidence Threshold</div>
              <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                {Math.round(settings.confidenceThreshold * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Only display detected objects exceeding this probability threshold.
            </p>
            <input
              type="range"
              min="0.2"
              max="0.85"
              step="0.05"
              value={settings.confidenceThreshold}
              onChange={(e) => onUpdateSettings({ confidenceThreshold: parseFloat(e.target.value) })}
              className="w-full accent-neutral-900 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 font-semibold px-1">
              <span>20% (More objects)</span>
              <span>50% (Default)</span>
              <span>85% (Strict)</span>
            </div>
          </div>

          {/* 3. Distance Estimation ON / OFF */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-neutral-200 bg-neutral-50">
            <div>
              <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                <span>Distance Estimation</span>
              </div>
              <div className="text-[11px] text-neutral-500">
                Calculate estimated distance in meters based on geometry
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ distanceEstimation: !settings.distanceEstimation })}
              role="switch"
              aria-checked={settings.distanceEstimation}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.distanceEstimation ? 'bg-neutral-900' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.distanceEstimation ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 4. Voice Announcements ON / OFF */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-neutral-200 bg-neutral-50">
            <div>
              <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Spoken Announcements</span>
              </div>
              <div className="text-[11px] text-neutral-500">
                Speak detected object names and distances with cooldown
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ voiceAnnouncements: !settings.voiceAnnouncements })}
              role="switch"
              aria-checked={settings.voiceAnnouncements}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.voiceAnnouncements ? 'bg-neutral-900' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.voiceAnnouncements ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 5. Danger / Proximity Alerts ON / OFF */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-neutral-200 bg-neutral-50">
            <div>
              <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                <span>Proximity Hazard Warnings</span>
              </div>
              <div className="text-[11px] text-neutral-500">
                Immediately warn when an object is very close (&lt; 1.5 m)
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ dangerAlerts: !settings.dangerAlerts })}
              role="switch"
              aria-checked={settings.dangerAlerts}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.dangerAlerts ? 'bg-neutral-900' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.dangerAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 6. Target FPS */}
          <div className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-neutral-900">Target Detection Rate</div>
              <span className="text-xs font-black text-neutral-900">{settings.targetFps} FPS</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 15, 20, 30].map((rate) => (
                <button
                  key={rate}
                  onClick={() => onUpdateSettings({ targetFps: rate })}
                  className={`py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                    settings.targetFps === rate
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {rate} FPS
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3 text-xs font-bold text-white shadow-md hover:bg-neutral-800 transition active:scale-95"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Save &amp; Close</span>
        </button>
      </div>
    </div>
  );
};
