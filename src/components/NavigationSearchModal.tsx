import React, { useState } from 'react';
import { Search, MapPin, X, Navigation, Home, ShieldPlus, Pill, Banknote, Bus } from 'lucide-react';

interface NavigationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (destination: string) => void;
  homeAddress: string;
}

export const NavigationSearchModal: React.FC<NavigationSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  homeAddress,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      onClose();
    }
  };

  const handleQuickPlace = (placeName: string) => {
    onSearch(placeName);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nav-search-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-neutral-900 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-neutral-900" />
            <h2 id="nav-search-title" className="text-base font-bold text-neutral-900">
              Where do you want to go?
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close search"
            className="rounded-xl p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Pune Railway Station, City Hospital"
              className="w-full rounded-2xl border-2 border-neutral-900 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-neutral-400" />
          </div>

          <button
            type="submit"
            disabled={!query.trim()}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3 text-sm font-black uppercase tracking-wider text-white shadow-md hover:bg-neutral-800 disabled:opacity-50 transition active:scale-95"
          >
            <Navigation className="h-4 w-4" />
            <span>Search &amp; Navigate</span>
          </button>
        </form>

        {/* Quick Destinations */}
        <div className="mt-5 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Quick Destinations
          </div>

          <div className="grid grid-cols-2 gap-2">
            {homeAddress && (
              <button
                onClick={() => handleQuickPlace(homeAddress)}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-left hover:border-neutral-900 hover:bg-neutral-100 transition active:scale-95 text-xs font-bold text-neutral-900"
              >
                <Home className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="truncate">Home ({homeAddress})</span>
              </button>
            )}

            <button
              onClick={() => handleQuickPlace('Pune Railway Station')}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-left hover:border-neutral-900 hover:bg-neutral-100 transition active:scale-95 text-xs font-bold text-neutral-900"
            >
              <MapPin className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="truncate">Railway Station</span>
            </button>

            <button
              onClick={() => handleQuickPlace('nearest hospital')}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-left hover:border-neutral-900 hover:bg-neutral-100 transition active:scale-95 text-xs font-bold text-neutral-900"
            >
              <ShieldPlus className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="truncate">Nearest Hospital</span>
            </button>

            <button
              onClick={() => handleQuickPlace('nearest pharmacy')}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-left hover:border-neutral-900 hover:bg-neutral-100 transition active:scale-95 text-xs font-bold text-neutral-900"
            >
              <Pill className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <span className="truncate">Nearest Pharmacy</span>
            </button>

            <button
              onClick={() => handleQuickPlace('nearest ATM')}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-left hover:border-neutral-900 hover:bg-neutral-100 transition active:scale-95 text-xs font-bold text-neutral-900"
            >
              <Banknote className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span className="truncate">Nearest ATM</span>
            </button>

            <button
              onClick={() => handleQuickPlace('nearest bus stop')}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-left hover:border-neutral-900 hover:bg-neutral-100 transition active:scale-95 text-xs font-bold text-neutral-900"
            >
              <Bus className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              <span className="truncate">Nearest Bus Stop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
