import React, { useState } from 'react';
import { Download, HelpCircle, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable ? (
        <button
          onClick={install}
          aria-label="Install VisionGuide PWA application"
          className="flex items-center gap-2 rounded-xl bg-neutral-900 text-white px-3.5 py-2 text-xs font-semibold shadow-sm hover:bg-neutral-800 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
        >
          <Download className="w-4 h-4 text-white" aria-hidden="true" />
          <span>Install App</span>
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          aria-label="How to install this application"
          className="flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white text-neutral-800 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
        >
          <HelpCircle className="w-3.5 h-3.5 text-neutral-500" aria-hidden="true" />
          <span>Install Guide</span>
        </button>
      )}

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 id="install-guide-title" className="text-base font-bold text-neutral-900">
                Install VisionGuide PWA
              </h3>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close install guide"
                className="p-1 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-neutral-700">
              {isIOS ? (
                <>
                  <p className="font-medium text-neutral-900">For iPhone / iPad (Safari):</p>
                  <ol className="list-decimal list-inside space-y-2 pl-1">
                    <li>Tap the <strong>Share</strong> button in the bottom Safari bar.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top-right corner.</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-medium text-neutral-900">For Android (Chrome):</p>
                  <p className="bg-neutral-100 p-3 rounded-xl border border-neutral-200 text-neutral-900 font-medium">
                    &quot;To install this application, open the browser menu (three dots in top right) and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.&quot;
                  </p>
                </>
              )}
              <p className="text-xs text-neutral-500 pt-1">
                Once installed, VisionGuide runs full-screen without browser bars, with fast offline launch and seamless earbud audio.
              </p>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-5 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </>
  );
};
