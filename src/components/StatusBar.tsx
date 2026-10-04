import React from 'react';
import { Camera, Mic, Navigation2, Wifi, Headphones, Cpu } from 'lucide-react';
import { AppMode, DeviceStatus } from '../types';

interface StatusBarProps {
  status: DeviceStatus;
  currentMode: AppMode;
  onSelectStatus?: (key: keyof DeviceStatus) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, currentMode }) => {
  const getModeLabel = (mode: AppMode) => {
    switch (mode) {
      case 'assist':
        return 'ASSIST';
      case 'navigation':
        return 'NAVIGATION';
      case 'read':
        return 'READ';
      case 'describe':
        return 'DESCRIBE';
      case 'ask_ai':
        return 'ASK AI';
      case 'emergency':
        return 'EMERGENCY';
      default:
        return 'ASSIST';
    }
  };

  return (
    <section
      aria-label="System Connection and Mode Status"
      className="w-full border-b border-neutral-200 bg-white px-3 py-2 text-xs font-semibold"
    >
      <div className="mx-auto max-w-4xl space-y-2">
        {/* Current Active Mode Banner */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Current Mode:
            </span>
            <span className="inline-flex items-center rounded-lg bg-neutral-900 px-2.5 py-0.5 text-xs font-black text-white uppercase tracking-wider">
              {getModeLabel(currentMode)}
            </span>
          </div>

          <div className="text-[11px] text-neutral-500 font-medium">
            AI Assistant: <span className="font-bold text-neutral-900">{status.ai.toUpperCase()}</span>
          </div>
        </div>

        {/* Device Status Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-0.5">
          {/* Camera */}
          <div
            className={`flex items-center gap-1.5 rounded-xl border p-2 transition ${
              status.camera === 'connected'
                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <Camera className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 leading-none">
              <div className="text-[10px] text-neutral-500 font-semibold uppercase">Camera</div>
              <div className="truncate text-[11px] font-black uppercase">
                {status.camera === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
              </div>
            </div>
          </div>

          {/* Microphone */}
          <div
            className={`flex items-center gap-1.5 rounded-xl border p-2 transition ${
              status.microphone === 'listening'
                ? 'border-blue-300 bg-blue-50 text-blue-900 animate-pulse'
                : status.microphone === 'ready'
                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <Mic className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 leading-none">
              <div className="text-[10px] text-neutral-500 font-semibold uppercase">Microphone</div>
              <div className="truncate text-[11px] font-black uppercase">
                {status.microphone === 'listening'
                  ? 'LISTENING'
                  : status.microphone === 'ready'
                  ? 'READY'
                  : 'DISCONNECTED'}
              </div>
            </div>
          </div>

          {/* GPS */}
          <div
            className={`flex items-center gap-1.5 rounded-xl border p-2 transition ${
              status.gps === 'available'
                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <Navigation2 className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 leading-none">
              <div className="text-[10px] text-neutral-500 font-semibold uppercase">GPS</div>
              <div className="truncate text-[11px] font-black uppercase">
                {status.gps === 'available' ? 'AVAILABLE' : 'UNAVAILABLE'}
              </div>
            </div>
          </div>

          {/* Internet */}
          <div
            className={`flex items-center gap-1.5 rounded-xl border p-2 transition ${
              status.internet === 'connected'
                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <Wifi className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 leading-none">
              <div className="text-[10px] text-neutral-500 font-semibold uppercase">Internet</div>
              <div className="truncate text-[11px] font-black uppercase">
                {status.internet === 'connected' ? 'CONNECTED' : 'OFFLINE'}
              </div>
            </div>
          </div>

          {/* Bluetooth Audio */}
          <div
            className={`flex items-center gap-1.5 rounded-xl border p-2 transition ${
              status.bluetooth === 'connected'
                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                : 'border-neutral-200 bg-neutral-50 text-neutral-700'
            }`}
          >
            <Headphones className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 leading-none">
              <div className="text-[10px] text-neutral-500 font-semibold uppercase">Earbuds</div>
              <div className="truncate text-[11px] font-black uppercase">
                {status.bluetooth === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
              </div>
            </div>
          </div>

          {/* AI Processor */}
          <div
            className={`flex items-center gap-1.5 rounded-xl border p-2 transition ${
              status.ai === 'processing'
                ? 'border-blue-300 bg-blue-50 text-blue-900'
                : status.ai === 'ready'
                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                : 'border-neutral-200 bg-neutral-50 text-neutral-700'
            }`}
          >
            <Cpu className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 leading-none">
              <div className="text-[10px] text-neutral-500 font-semibold uppercase">AI Engine</div>
              <div className="truncate text-[11px] font-black uppercase">
                {status.ai === 'processing' ? 'SCANNING' : status.ai === 'ready' ? 'READY' : 'OFFLINE'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
