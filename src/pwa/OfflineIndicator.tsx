import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from './useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-md flex items-center justify-between gap-3 rounded-2xl bg-amber-600 px-4 py-3 text-white shadow-xl border border-amber-500 animate-in fade-in"
    >
      <div className="flex items-center gap-3">
        <WifiOff className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <div className="text-xs font-medium leading-tight">
          <p className="font-bold">Offline Mode Active</p>
          <p className="text-amber-100">Cached PWA active. Cloud AI &amp; map routing are temporarily paused.</p>
        </div>
      </div>
    </div>
  );
};
