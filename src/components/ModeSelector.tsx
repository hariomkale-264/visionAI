import React from 'react';
import { Play, Square, Navigation, BookOpen, Compass, ShieldAlert } from 'lucide-react';
import { AppMode } from '../types';

interface ModeSelectorProps {
  currentMode: AppMode;
  isAssistanceActive: boolean;
  onToggleAssistance: () => void;
  onSelectMode: (mode: AppMode) => void;
  onOpenEmergency: () => void;
  onOpenNavigation: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  isAssistanceActive,
  onToggleAssistance,
  onSelectMode,
  onOpenEmergency,
  onOpenNavigation,
}) => {
  return (
    <section aria-label="Main Application Feature Cards" className="w-full space-y-2.5">
      {/* Primary Hero Assistance Toggle */}
      <button
        onClick={onToggleAssistance}
        aria-label={
          isAssistanceActive
            ? 'Stop Vision AI Assistant and stop continuous microphone'
            : 'Start Vision AI Assistant and begin continuous microphone listening'
        }
        className={`w-full flex items-center justify-center gap-3 rounded-2xl py-4 px-6 text-base font-black uppercase tracking-wider shadow-md transition active:scale-[0.99] focus:ring-4 focus:ring-neutral-900 focus:outline-none ${
          isAssistanceActive
            ? 'bg-red-600 text-white hover:bg-red-700 border-2 border-red-700 ring-2 ring-red-300'
            : 'bg-neutral-900 text-white hover:bg-neutral-800 border-2 border-neutral-900'
        }`}
      >
        {isAssistanceActive ? (
          <>
            <Square className="h-6 w-6 text-white fill-white" aria-hidden="true" />
            <span>STOP ASSISTANT</span>
          </>
        ) : (
          <>
            <Play className="h-6 w-6 text-emerald-400 fill-emerald-400" aria-hidden="true" />
            <span>START ASSISTANT</span>
          </>
        )}
      </button>

      {/* Grid of Exactly Four Core Cards: Navigation, Read Text, Describe, Emergency */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Navigation Card */}
        <button
          onClick={onOpenNavigation}
          aria-label="1. Navigation Card. Voice walking directions with Google Maps"
          aria-pressed={currentMode === 'navigation'}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3.5 text-center transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none ${
            currentMode === 'navigation'
              ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
              : 'border-neutral-200 bg-white text-neutral-800 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          <div
            className={`p-2 rounded-xl ${
              currentMode === 'navigation' ? 'bg-white/20' : 'bg-blue-100 text-blue-700'
            }`}
          >
            <Navigation className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wide">Navigation</div>
            <div className={`text-[10px] ${currentMode === 'navigation' ? 'text-blue-100' : 'text-neutral-500'}`}>
              Google Maps
            </div>
          </div>
        </button>

        {/* 2. Read Text Card (OCR) */}
        <button
          onClick={() => onSelectMode('read')}
          aria-label="2. Read Text Card. Read signs, labels, boards and documents aloud"
          aria-pressed={currentMode === 'read'}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3.5 text-center transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none ${
            currentMode === 'read'
              ? 'border-purple-600 bg-purple-600 text-white shadow-md ring-2 ring-purple-300'
              : 'border-neutral-200 bg-white text-neutral-800 hover:border-purple-400 hover:bg-purple-50/50'
          }`}
        >
          <div
            className={`p-2 rounded-xl ${
              currentMode === 'read' ? 'bg-white/20' : 'bg-purple-100 text-purple-700'
            }`}
          >
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wide">Read Text</div>
            <div className={`text-[10px] ${currentMode === 'read' ? 'text-purple-100' : 'text-neutral-500'}`}>
              Signs & Labels
            </div>
          </div>
        </button>

        {/* 3. Describe Card */}
        <button
          onClick={() => onSelectMode('describe')}
          aria-label="3. Describe Card. Get a calm 2 to 3 sentence spoken description of surroundings"
          aria-pressed={currentMode === 'describe'}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3.5 text-center transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none ${
            currentMode === 'describe'
              ? 'border-amber-600 bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
              : 'border-neutral-200 bg-white text-neutral-800 hover:border-amber-400 hover:bg-amber-50/50'
          }`}
        >
          <div
            className={`p-2 rounded-xl ${
              currentMode === 'describe' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Compass className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wide">Describe</div>
            <div className={`text-[10px] ${currentMode === 'describe' ? 'text-amber-100' : 'text-neutral-500'}`}>
              Surroundings
            </div>
          </div>
        </button>

        {/* 4. Emergency Card */}
        <button
          onClick={onOpenEmergency}
          aria-label="4. Emergency Card. Share location, contact emergency helper or trigger SOS"
          aria-pressed={currentMode === 'emergency'}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3.5 text-center transition active:scale-95 focus:ring-2 focus:ring-red-600 focus:outline-none ${
            currentMode === 'emergency'
              ? 'border-red-600 bg-red-600 text-white shadow-md ring-2 ring-red-300'
              : 'border-red-200 bg-red-50 text-red-900 hover:border-red-400 hover:bg-red-100'
          }`}
        >
          <div
            className={`p-2 rounded-xl ${
              currentMode === 'emergency' ? 'bg-white/20 text-white' : 'bg-red-200 text-red-700'
            }`}
          >
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wide">Emergency</div>
            <div className={`text-[10px] ${currentMode === 'emergency' ? 'text-red-100' : 'text-red-700'}`}>
              SOS & Help
            </div>
          </div>
        </button>
      </div>
    </section>
  );
};
