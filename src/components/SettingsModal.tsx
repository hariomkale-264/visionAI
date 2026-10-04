import React, { useState } from 'react';
import { Settings, Home, Phone, AlertTriangle, X, Save, RefreshCw, Globe, Check } from 'lucide-react';
import { speechManager } from '../voice/SpeechManager';
import { SUPPORTED_LANGUAGES, AppLanguage } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeAddress: string;
  onSaveHome: (val: string) => void;
  emergencyName: string;
  emergencyPhone: string;
  onSaveEmergency: (name: string, phone: string) => void;
  onRerunSetup: () => void;
  currentLanguage: string;
  onSelectLanguage: (lang: AppLanguage) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  homeAddress,
  onSaveHome,
  emergencyName,
  emergencyPhone,
  onSaveEmergency,
  onRerunSetup,
  currentLanguage,
  onSelectLanguage,
}) => {
  const [home, setHome] = useState(homeAddress);
  const [name, setName] = useState(emergencyName);
  const [phone, setPhone] = useState(emergencyPhone);
  const [selectedLang, setSelectedLang] = useState(currentLanguage);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveHome(home.trim());
    onSaveEmergency(name.trim(), phone.trim());
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang);
    if (langObj && selectedLang !== currentLanguage) {
      onSelectLanguage(langObj);
    }
    speechManager.speak('Settings updated successfully.', 4, true);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-neutral-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-neutral-900" />
            <h2 id="settings-dialog-title" className="text-base font-black text-neutral-900">
              Assistant Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-xl p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Assistant Language Picker */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              <span>Voice &amp; Assistant Language</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLang(lang.code)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-left transition active:scale-95 text-xs font-semibold ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400'
                    }`}
                  >
                    <span className="truncate">
                      {lang.flag} {lang.nativeName}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 ml-1 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Home Address */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              <Home className="h-3.5 w-3.5 text-neutral-900" />
              <span>Home Location (&quot;Take me home&quot;)</span>
            </label>
            <input
              type="text"
              value={home}
              onChange={(e) => setHome(e.target.value)}
              placeholder="e.g. 104 Main Street, Pune"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
              <Phone className="h-3.5 w-3.5 text-red-600" />
              <span>Emergency Contact Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Guardian / Family member"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none mb-2"
            />

            <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1 block">
              Emergency Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 555-0199 or 911"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {/* Re-run Onboarding */}
          <div className="pt-2 border-t border-neutral-100">
            <button
              onClick={() => {
                onClose();
                onRerunSetup();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Re-run First-Time Permission Setup</span>
            </button>
          </div>

          {/* Safety Disclaimer */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span>Safety Notice (Section 53)</span>
            </div>
            <p className="leading-relaxed">
              VisionGuide AI is a supplementary mobility tool. It does not replace a white cane, guide dog, or mobility training. Computer vision distance estimations are approximate.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3 text-sm font-bold text-white shadow-md hover:bg-neutral-800 transition active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
