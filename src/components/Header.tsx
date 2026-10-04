import React from 'react';
import { Volume2, Settings, ShieldAlert, Sparkles, RotateCcw, Globe } from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { speechManager } from '../voice/SpeechManager';
import { SUPPORTED_LANGUAGES } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenEmergency: () => void;
  onOpenLanguage: () => void;
  currentLanguage: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenEmergency,
  onOpenLanguage,
  currentLanguage,
}) => {
  const handleRepeatLast = () => {
    speechManager.repeatLastMessage();
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-sm px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
        {/* App Title & Accessibility Tag */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm">
            <Sparkles className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-neutral-900 leading-none">
              VisionGuide AI
            </h1>
            <p className="text-[11px] font-medium text-neutral-500 leading-none mt-1">
              Visual &amp; Mobility Assistant
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Language Switcher */}
          <button
            onClick={onOpenLanguage}
            aria-label={`Switch assistant language. Current: ${currentLangObj?.name || 'English'}`}
            title="Switch Language"
            className="flex h-9 items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2 sm:px-2.5 text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
          >
            <Globe className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" aria-hidden="true" />
            <span className="text-[11px] font-black uppercase">
              {currentLangObj ? currentLangObj.code.split('-')[0].toUpperCase() : 'EN'}
            </span>
          </button>

          {/* Repeat Spoken Message */}
          <button
            onClick={handleRepeatLast}
            aria-label="Repeat last spoken message"
            title="Repeat last voice message"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Emergency Button */}
          <button
            onClick={onOpenEmergency}
            aria-label="Trigger Emergency Assistance"
            className="flex h-9 items-center gap-1.5 rounded-xl bg-red-600 px-2.5 sm:px-3 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition active:scale-95 focus:ring-2 focus:ring-red-600 focus:outline-none"
          >
            <ShieldAlert className="h-4 w-4 text-white" aria-hidden="true" />
            <span className="hidden sm:inline">Emergency</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            aria-label="Open Assistant Settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};

