import React from 'react';
import { Mic, MicOff, Volume2, MessageSquare } from 'lucide-react';

interface VoiceAssistantBarProps {
  micStatus: 'ready' | 'listening' | 'disconnected' | 'denied' | 'requesting';
  currentTranscript: string;
  lastSpokenText: string;
  onToggleMic: () => void;
  onQuickCommand: (command: string) => void;
}

export const VoiceAssistantBar: React.FC<VoiceAssistantBarProps> = ({
  micStatus,
  currentTranscript,
  lastSpokenText,
  onToggleMic,
  onQuickCommand,
}) => {
  const isListening = micStatus === 'listening';

  const quickCommands = [
    "What's ahead?",
    'Read this',
    'Describe surroundings',
    'Where am I?',
    'Take me home',
  ];

  return (
    <footer
      aria-label="Voice Assistant Interaction Bar"
      className="sticky bottom-0 z-30 w-full border-t border-neutral-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
    >
      <div className="mx-auto max-w-4xl space-y-2.5">
        {/* Real-time Voice Readout & Hearing Feedback */}
        <div className="flex items-center gap-2 rounded-xl bg-neutral-50 border border-neutral-200 p-2.5 min-h-[46px]">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
            {isListening ? (
              <Mic className="h-4 w-4 text-blue-400 animate-pulse" />
            ) : (
              <Volume2 className="h-4 w-4 text-neutral-300" />
            )}
          </div>

          <div className="flex-1 min-w-0 text-xs">
            {currentTranscript ? (
              <p className="font-bold text-neutral-900 truncate">
                <span className="text-neutral-500 font-semibold">Heard: </span>
                &quot;{currentTranscript}&quot;
              </p>
            ) : lastSpokenText ? (
              <p className="font-semibold text-neutral-700 truncate">
                <span className="text-neutral-400 font-medium">Assistant: </span>
                {lastSpokenText}
              </p>
            ) : (
              <p className="text-neutral-400 font-medium italic">
                {isListening
                  ? 'Listening for voice commands... (e.g. "What\'s ahead?", "Take me to Pune Railway Station")'
                  : 'Tap microphone or say "Hey assistant" to speak.'}
              </p>
            )}
          </div>

          {/* Quick Voice Shortcut trigger indicator */}
          {isListening && (
            <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
              LIVE
            </span>
          )}
        </div>

        {/* Big Mic Button & Quick Prompts Row */}
        <div className="flex items-center gap-3">
          {/* Main Accessible Microphone Push/Toggle Button */}
          <button
            onClick={onToggleMic}
            aria-label={
              isListening
                ? 'Microphone is active and listening. Tap to pause microphone.'
                : 'Microphone is ready. Tap to activate microphone voice recognition.'
            }
            className={`flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl shadow-lg transition active:scale-95 focus:ring-4 focus:ring-neutral-900 focus:outline-none ${
              isListening
                ? 'bg-blue-600 text-white hover:bg-blue-700 ring-4 ring-blue-200'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            {isListening ? (
              <Mic className="h-7 w-7 text-white animate-pulse" aria-hidden="true" />
            ) : (
              <MicOff className="h-6 w-6 text-neutral-300" aria-hidden="true" />
            )}
          </button>

          {/* Quick Command Accessible Carousel */}
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 py-1">
            {quickCommands.map((cmd) => (
              <button
                key={cmd}
                onClick={() => onQuickCommand(cmd)}
                aria-label={`Execute voice command: ${cmd}`}
                className="flex-shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-800 hover:border-neutral-900 hover:bg-neutral-50 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
