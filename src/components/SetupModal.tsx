import React, { useState } from 'react';
import { Camera, Mic, MapPin, Bell, Headphones, Home, CheckCircle2, ArrowRight } from 'lucide-react';
import { speechManager } from '../voice/SpeechManager';
import { notificationManager } from '../utils/notificationManager';

interface SetupModalProps {
  isOpen: boolean;
  onComplete: (homeAddress: string) => void;
  onRequestCamera: () => Promise<boolean>;
  onRequestMic: () => void;
  onRequestGps: () => void;
  cameraStatus: string;
  micStatus: string;
  gpsStatus: string;
  bluetoothStatus: string;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  onComplete,
  onRequestCamera,
  onRequestMic,
  onRequestGps,
  cameraStatus,
  micStatus,
  gpsStatus,
  bluetoothStatus,
}) => {
  const [step, setStep] = useState(1);
  const [homeInput, setHomeInput] = useState('');
  const [notifGranted, setNotifGranted] = useState(false);

  if (!isOpen) return null;

  const handleNext = async () => {
    if (step === 1) {
      speechManager.speak('Requesting camera permission to detect obstacles.', 3, true);
      await onRequestCamera();
      setStep(2);
    } else if (step === 2) {
      speechManager.speak('Requesting microphone permission for hands-free voice commands.', 3, true);
      onRequestMic();
      setStep(3);
    } else if (step === 3) {
      speechManager.speak('Requesting location permission for walking navigation.', 3, true);
      onRequestGps();
      setStep(4);
    } else if (step === 4) {
      const perm = await notificationManager.requestPermission();
      setNotifGranted(perm === 'granted');
      speechManager.speak('Optional notifications configured.', 4, true);
      setStep(5);
    } else if (step === 5) {
      speechManager.speak(
        bluetoothStatus === 'connected'
          ? 'Bluetooth audio connected.'
          : 'You can connect Bluetooth earbuds to hear private audio cues.',
        3,
        true
      );
      setStep(6);
    } else if (step === 6) {
      speechManager.speak('Setup complete. Say Start Assistance when you are ready.', 3, true);
      onComplete(homeInput.trim());
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-neutral-900 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-sm mb-3">
            <CheckCircle2 className="h-6 w-6 text-blue-400" />
          </div>
          <h2 id="setup-title" className="text-xl font-black text-neutral-900">
            Welcome to VisionGuide AI
          </h2>
          <p className="text-xs text-neutral-500 font-semibold mt-1">
            Step {step} of 6 — First-Launch Guided Experience
          </p>
        </div>

        {/* Step Contents */}
        <div className="space-y-4 mb-6">
          {step === 1 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
              <Camera className="mx-auto h-10 w-10 text-neutral-900 mb-2" />
              <h3 className="text-sm font-bold text-neutral-900">1. Physical Rear Camera</h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                The camera is needed to detect obstacles and understand your surroundings.
              </p>
              <div className="mt-3 inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
                Status: <span className="font-bold uppercase text-neutral-900">{cameraStatus}</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
              <Mic className="mx-auto h-10 w-10 text-neutral-900 mb-2" />
              <h3 className="text-sm font-bold text-neutral-900">2. Microphone Permission</h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                The microphone is needed for voice commands.
              </p>
              <div className="mt-3 inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
                Status: <span className="font-bold uppercase text-neutral-900">{micStatus}</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
              <MapPin className="mx-auto h-10 w-10 text-neutral-900 mb-2" />
              <h3 className="text-sm font-bold text-neutral-900">3. Location Permission</h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Location is needed for navigation and finding nearby places.
              </p>
              <div className="mt-3 inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
                Status: <span className="font-bold uppercase text-neutral-900">{gpsStatus}</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
              <Bell className="mx-auto h-10 w-10 text-neutral-900 mb-2" />
              <h3 className="text-sm font-bold text-neutral-900">4. Optional Notifications</h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Allow notifications for non-critical status updates, arrival alerts, and connectivity notices.
              </p>
              <div className="mt-3 inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
                Status:{' '}
                <span className="font-bold uppercase text-neutral-900">
                  {notifGranted ? 'Granted' : 'Optional'}
                </span>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
              <Headphones className="mx-auto h-10 w-10 text-neutral-900 mb-2" />
              <h3 className="text-sm font-bold text-neutral-900">5. Bluetooth Earbuds Check</h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                The application routes voice guidance to your phone audio or Bluetooth earbuds.
              </p>
              <div className="mt-3 inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-neutral-200">
                Audio Output:{' '}
                <span className="font-bold uppercase text-neutral-900">
                  {bluetoothStatus === 'connected' ? 'Earbuds Connected' : 'Default Speaker'}
                </span>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <Home className="mx-auto h-10 w-10 text-neutral-900 mb-2" />
              <h3 className="text-sm font-bold text-neutral-900 text-center">
                6. Home Location Setup (Optional)
              </h3>
              <p className="text-xs text-neutral-600 text-center mt-1 mb-3">
                Save your home landmark so you can quickly say &quot;Take me home&quot;.
              </p>
              <input
                type="text"
                value={homeInput}
                onChange={(e) => setHomeInput(e.target.value)}
                placeholder="e.g. Pune Railway Station or 104 Main Street"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg hover:bg-neutral-800 transition active:scale-95 focus:ring-4 focus:ring-neutral-900 focus:outline-none"
        >
          <span>{step === 6 ? 'Setup Complete — Finish' : 'Continue'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
