import React from 'react';
import { Globe, Check, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, AppLanguage } from '../types';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
  onSelectLanguage: (lang: AppLanguage) => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onSelectLanguage,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-neutral-900 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white">
              <Globe className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 id="language-dialog-title" className="text-base font-black text-neutral-900 leading-none">
                Select Assistant Language
              </h2>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                Voice speech, AI alerts &amp; recognition
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close language selector"
            className="rounded-xl p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List of Languages */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang);
                  onClose();
                }}
                aria-label={`Select language: ${lang.name}, ${lang.nativeName}`}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition active:scale-[0.99] text-left focus:ring-2 focus:ring-neutral-900 focus:outline-none ${
                  isSelected
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-hidden="true">
                    {lang.flag}
                  </span>
                  <div>
                    <div className="text-sm font-black leading-tight">
                      {lang.nativeName}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-neutral-300' : 'text-neutral-500'
                      }`}
                    >
                      {lang.name}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-neutral-900">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-neutral-100 text-center">
          <p className="text-xs text-neutral-500 font-medium">
            You can also say <span className="font-bold text-neutral-900">&quot;Switch to Hindi&quot;</span>,{' '}
            <span className="font-bold text-neutral-900">&quot;Switch to Marathi&quot;</span>, or{' '}
            <span className="font-bold text-neutral-900">&quot;Switch to English&quot;</span> anytime hands-free.
          </p>
        </div>
      </div>
    </div>
  );
};
