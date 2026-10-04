import React from 'react';
import { Play, Square, Navigation, BookOpen, Compass, HelpCircle, ShieldAlert } from 'lucide-react';
import { AppMode } from '../types';

interface ModeSelectorProps {
  currentMode: AppMode;
  isAssistanceActive: boolean;
  onToggleAssistance: () => void;
  onSelectMode: (mode: AppMode) => void;
  onOpenEmergency: () => void;
  onOpenNavigationSearch: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  isAssistanceActive,
  onToggleAssistance,
  onSelectMode,
  onOpenEmergency,
  onOpenNavigationSearch,
}) => {
  return (
    <section aria-label="Main Application Controls" className="w-full space-y-2.5">
      {/* Primary Hero Assistance Toggle */}
      <button
        onClick={onToggleAssistance}
        aria-label={
          isAssistanceActive
            ? 'Stop AI Assistance and camera scanning'
            : 'Start AI Assistance and physical camera obstacle scanning'
        }
        className={`w-full flex items-center justify-center gap-3 rounded-2xl py-4 px-6 text-base font-black uppercase tracking-wider shadow-md transition active:scale-[0.99] focus:ring-4 focus:ring-neutral-900 focus:outline-none ${
          isAssistanceActive
            ? 'bg-neutral-900 text-white hover:bg-neutral-800'
            : 'bg-neutral-900 text-white hover:bg-neutral-800 border-2 border-neutral-900'
        }`}
      >
        {isAssistanceActive ? (
          <>
            <Square className="h-6 w-6 text-red-400 fill-red-400" aria-hidden="true" />
            <span>STOP ASSISTANCE</span>
          </>
        ) : (
          <>
            <Play className="h-6 w-6 text-emerald-400 fill-emerald-400" aria-hidden="true" />
            <span>START ASSISTANCE</span>
          </>
        )}
      </button>

      {/* Grid of Main Modes */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {/* Navigation */}
        <button
          onClick={onOpenNavigationSearch}
          aria-label="Start Walking Navigation. Search destination or navigate home"
          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none ${
            currentMode === 'navigation'
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50'
          }`}
        >
          <Navigation
            className={`h-5 w-5 ${currentMode === 'navigation' ? 'text-white' : 'text-blue-600'}`}
            aria-hidden="true"
          />
          <span className="text-xs font-black uppercase tracking-wide">Navigation</span>
        </button>

        {/* Read Mode (OCR) */}
        <button
          onClick={() => onSelectMode('read')}
          aria-label="Read Mode. Capture camera view and read signs, labels, or documents aloud"
          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none ${
            currentMode === 'read'
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50'
          }`}
        >
          <BookOpen
            className={`h-5 w-5 ${currentMode === 'read' ? 'text-white' : 'text-purple-600'}`}
            aria-hidden="true"
          />
          <span className="text-xs font-black uppercase tracking-wide">Read Text</span>
        </button>

        {/* Describe Mode */}
        <button
          onClick={() => onSelectMode('describe')}
          aria-label="Describe Surroundings. Get a short 2 to 3 sentence spoken description of the scene"
          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none ${
            currentMode === 'describe'
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50'
          }`}
        >
          <Compass
            className={`h-5 w-5 ${currentMode === 'describe' ? 'text-white' : 'text-amber-600'}`}
            aria-hidden="true"
          />
          <span className="text-xs font-black uppercase tracking-wide">Describe</span>
        </button>

        {/* Ask AI Mode */}
        <button
          onClick={() => onSelectMode('ask_ai')}
          aria-label="Ask AI. Ask questions about the current camera view"
          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none ${
            currentMode === 'ask_ai'
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50'
          }`}
        >
          <HelpCircle
            className={`h-5 w-5 ${currentMode === 'ask_ai' ? 'text-white' : 'text-emerald-600'}`}
            aria-hidden="true"
          />
          <span className="text-xs font-black uppercase tracking-wide">Ask AI</span>
        </button>

        {/* Emergency */}
        <button
          onClick={onOpenEmergency}
          aria-label="Emergency Mode. Share location, contact emergency contact, or get help"
          className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-red-300 bg-red-50 text-red-900 p-3 text-center hover:bg-red-100 hover:border-red-400 transition active:scale-95 focus:ring-2 focus:ring-red-600 focus:outline-none"
        >
          <ShieldAlert className="h-5 w-5 text-red-600" aria-hidden="true" />
          <span className="text-xs font-black uppercase tracking-wide">Emergency</span>
        </button>
      </div>
    </section>
  );
};
