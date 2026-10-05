import React from 'react';
import { Mic, MicOff, Volume2, Square, RotateCcw, HelpCircle } from 'lucide-react';
import { VoiceSessionState } from '../voice/SpeechRecognitionManager';

interface VoiceAssistantBarProps {
  micStatus: 'ready' | 'listening' | 'disconnected' | 'denied' | 'requesting';
  voiceState?: VoiceSessionState;
  isContinuousListening?: boolean;
  currentTranscript: string;
  lastSpokenText: string;
  isSpeaking?: boolean;
  onToggleMic: () => void;
  onQuickCommand: (command: string) => void;
  onStopSpeech: () => void;
  onRepeatSpeech: () => void;
  onOpenHelp: () => void;
}

export const VoiceAssistantBar: React.FC<VoiceAssistantBarProps> = ({
  micStatus,
  voiceState = 'IDLE',
  isContinuousListening = false,
  currentTranscript,
  lastSpokenText,
  isSpeaking = false,
  onToggleMic,
  onQuickCommand,
  onStopSpeech,
  onRepeatSpeech,
  onOpenHelp,
}) => {
  const isListening = isContinuousListening || micStatus === 'listening' || voiceState === 'LISTENING';

  const quickCommands = [
    'Go to object detection',
    'Open navigation',
    'Start camera',
    'Read text',
    'Describe this',
    'Emergency',
  ];

  return (
    <footer
      aria-label="Voice Assistant Interaction Bar"
      className="sticky bottom-0 z-30 w-full border-t border-neutral-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
    >
      <div className="mx-auto max-w-4xl space-y-2.5">
        {/* Real-time Voice Readout & Hearing Feedback */}
        <div className="flex items-center gap-2 rounded-xl bg-neutral-50 border border-neutral-200 p-2.5 min-h-[46px]">
          <div
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-white ${
              isSpeaking
                ? 'bg-amber-600'
                : isListening
                ? 'bg-emerald-600 animate-pulse'
                : 'bg-neutral-900'
            }`}
          >
            {isSpeaking ? (
              <Volume2 className="h-4 w-4 text-white animate-bounce" />
            ) : isListening ? (
              <Mic className="h-4 w-4 text-white" />
            ) : (
              <MicOff className="h-4 w-4 text-neutral-300" />
            )}
          </div>

          <div className="flex-1 min-w-0 text-xs" aria-live="polite">
            {currentTranscript ? (
              <p className="font-bold text-neutral-900 truncate">
                <span className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">
                  Heard:{' '}
                </span>
                &quot;{currentTranscript}&quot;
              </p>
            ) : lastSpokenText ? (
              <p className="font-semibold text-neutral-700 truncate">
                <span className="text-neutral-500 font-semibold text-[10px] uppercase">
                  Assistant:{' '}
                </span>
                {lastSpokenText}
              </p>
            ) : (
              <p className="text-neutral-500 font-medium italic">
                {isListening
                  ? 'Microphone active. Say any command: "Go to object detection", "Go to navigation", "Start camera"...'
                  : 'Assistant is stopped. Click Start Assistance or the microphone button.'}
              </p>
            )}
          </div>

          {/* User Requested UI: 🟢 Listening continuously / 🔴 Microphone stopped */}
          {isSpeaking ? (
            <span className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Speaking</span>
            </span>
          ) : isListening ? (
            <span
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-black tracking-wide text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 shadow-2xs"
              role="status"
              aria-label="Microphone status: Listening continuously"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Listening continuously</span>
            </span>
          ) : (
            <span
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-black tracking-wide text-red-800 bg-red-100 px-2.5 py-1 rounded-full border border-red-300 shadow-2xs"
              role="status"
              aria-label="Microphone status: Microphone stopped"
            >
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>Microphone stopped</span>
            </span>
          )}
        </div>

        {/* Big Mic Button, Quick Action Controls, and Prompts */}
        <div className="flex items-center gap-2">
          {/* Main Accessible Microphone Push/Toggle Button */}
          <button
            onClick={onToggleMic}
            aria-label={
              isListening
                ? 'Microphone is listening continuously. Click to stop microphone.'
                : 'Microphone is stopped. Click to start continuous microphone listening.'
            }
            title={isListening ? 'Stop continuous listening' : 'Start continuous listening'}
            className={`flex-shrink-0 flex items-center justify-center h-13 w-13 rounded-2xl shadow-md transition active:scale-95 focus:ring-4 focus:ring-neutral-900 focus:outline-none ${
              isListening
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-4 ring-emerald-200'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            {isListening ? (
              <Mic className="h-6 w-6 text-white animate-pulse" aria-hidden="true" />
            ) : (
              <MicOff className="h-6 w-6 text-neutral-300" aria-hidden="true" />
            )}
          </button>

          {/* Stop Speech / Silence Button */}
          <button
            onClick={onStopSpeech}
            aria-label="Stop current assistant speech"
            title="Silence assistant speech"
            className="flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-xl border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 hover:border-red-400 transition active:scale-95 focus:ring-2 focus:ring-red-600 focus:outline-none"
          >
            <Square className="h-4 w-4 text-red-600 fill-red-600" />
          </button>

          {/* Repeat Button */}
          <button
            onClick={onRepeatSpeech}
            aria-label="Repeat last spoken announcement"
            title="Repeat Last Message"
            className="flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-xl border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
          >
            <RotateCcw className="h-4 w-4 text-neutral-700" />
          </button>

          {/* Help Button */}
          <button
            onClick={onOpenHelp}
            aria-label="Voice command guide"
            title="Voice Commands Help"
            className="flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-xl border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
          >
            <HelpCircle className="h-4 w-4 text-blue-600" />
          </button>

          {/* Quick Command Accessible Carousel */}
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 py-1">
            {quickCommands.map((cmd) => (
              <button
                key={cmd}
                onClick={() => onQuickCommand(cmd)}
                aria-label={`Execute command: ${cmd}`}
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
