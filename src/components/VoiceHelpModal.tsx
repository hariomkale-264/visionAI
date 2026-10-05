import React from 'react';
import { HelpCircle, X, Volume2, Mic } from 'lucide-react';
import { audioManager } from '../voice/AudioManager';

interface VoiceHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceHelpModal: React.FC<VoiceHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const commands = [
    { cmd: '"Open navigation"', desc: 'Opens Navigation card and Google Maps directions' },
    { cmd: '"Take me to [Destination]"', desc: 'Finds destination, confirms with you, opens Google Maps' },
    { cmd: '"Read text" / "Read this"', desc: 'Captures camera view and reads signs, labels, or boards aloud' },
    { cmd: '"Describe this" / "What is ahead?"', desc: 'Gives a calm 2 to 3 sentence description of your surroundings' },
    { cmd: '"Emergency" / "Help me"', desc: 'Opens emergency workflow and shares coordinates' },
    { cmd: '"Stop" / "Stop speaking"', desc: 'Immediately stops assistant speech output' },
    { cmd: '"Repeat"', desc: 'Repeats the last spoken announcement' },
    { cmd: '"Switch camera" / "Laptop camera"', desc: 'Toggles between rear camera and laptop webcam' },
    { cmd: '"Change language to Hindi / Marathi"', desc: 'Switches voice and recognition language' },
  ];

  const handleReadAloud = () => {
    const text =
      'Available voice commands are: Say Open navigation to start walking directions. Say Take me to followed by your destination to open Google Maps. Say Read text to read signs and labels aloud. Say Describe this to hear your surroundings. Say Emergency for immediate help. Say Stop to silence speech, or Repeat to hear the last message again.';
    audioManager.speak(text, 4, true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-help-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl border-2 border-neutral-900 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Mic className="h-5 w-5" />
            </div>
            <h2 id="voice-help-title" className="text-lg font-black text-neutral-900">
              Voice Commands Guide
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close voice commands help"
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={handleReadAloud}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white py-2.5 px-4 text-xs font-bold shadow-sm hover:bg-blue-700 transition active:scale-95"
        >
          <Volume2 className="h-4 w-4" />
          <span>Read Commands Aloud</span>
        </button>

        <div className="space-y-2">
          {commands.map((c, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-xs"
            >
              <span className="font-bold text-neutral-900">{c.cmd}</span>
              <span className="text-neutral-500 text-[11px] mt-0.5 sm:mt-0">{c.desc}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-neutral-900 text-white py-3 text-sm font-bold hover:bg-neutral-800 transition active:scale-95"
        >
          Close Help
        </button>
      </div>
    </div>
  );
};
