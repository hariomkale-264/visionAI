import React from 'react';
import {
  Navigation,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  MapPin,
  ExternalLink,
  RotateCw,
  XCircle,
  CheckCircle,
  HelpCircle,
  Footprints,
} from 'lucide-react';
import { NavigationRoute, SearchResultPlace } from '../types';

interface NavigationDisplayProps {
  route: NavigationRoute | null;
  isNavigating: boolean;
  searchCandidates: SearchResultPlace[] | null;
  pendingDestination: SearchResultPlace | null;
  onConfirmDestination: (accepted: boolean) => void;
  onSelectCandidate: (index: number) => void;
  onRepeatInstruction: () => void;
  onStopNavigation: () => void;
  onRecalculate: () => void;
  onOpenPhoneMap: () => void;
}

export const NavigationDisplay: React.FC<NavigationDisplayProps> = ({
  route,
  isNavigating,
  searchCandidates,
  pendingDestination,
  onConfirmDestination,
  onSelectCandidate,
  onRepeatInstruction,
  onStopNavigation,
  onRecalculate,
  onOpenPhoneMap,
}) => {
  // Maneuver Icon Helper
  const getManeuverIcon = (modifier?: string, type?: string) => {
    if (type === 'arrive') return <MapPin className="h-6 w-6 text-emerald-600" />;
    const m = (modifier || '').toLowerCase();
    if (m.includes('right')) return <CornerUpRight className="h-6 w-6 text-blue-600" />;
    if (m.includes('left')) return <CornerUpLeft className="h-6 w-6 text-blue-600" />;
    return <ArrowUp className="h-6 w-6 text-neutral-900" />;
  };

  // 1. Destination Confirmation Dialog
  if (pendingDestination) {
    return (
      <div
        role="region"
        aria-label="Destination Confirmation"
        className="rounded-2xl border-2 border-neutral-900 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-2 text-neutral-900 font-bold">
          <HelpCircle className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm uppercase tracking-wider">Confirm Destination</h2>
        </div>

        <p className="text-base font-bold text-neutral-900 mb-1">
          {pendingDestination.name}
        </p>
        <p className="text-xs text-neutral-600 mb-4 truncate">
          {pendingDestination.displayName}
        </p>

        {pendingDestination.distanceMeters && (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800">
            <Footprints className="h-4 w-4" />
            <span>Approximately {pendingDestination.distanceMeters} meters away</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onConfirmDestination(true)}
            aria-label="Yes, start walking directions"
            className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Yes, Start Walk</span>
          </button>

          <button
            onClick={() => onConfirmDestination(false)}
            aria-label="Cancel destination"
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
          >
            <XCircle className="h-4 w-4 text-neutral-500" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Multiple Candidates Choice Dialog
  if (searchCandidates && searchCandidates.length > 0) {
    return (
      <div
        role="region"
        aria-label="Multiple Place Matches"
        className="rounded-2xl border-2 border-neutral-900 bg-white p-4 shadow-sm"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-2">
          Multiple Matches Found — Select One
        </h2>
        <p className="text-xs text-neutral-600 mb-3">
          Say &quot;the first one&quot; or tap your preferred destination:
        </p>

        <div className="space-y-2">
          {searchCandidates.map((place, idx) => (
            <button
              key={place.id}
              onClick={() => onSelectCandidate(idx)}
              className="w-full text-left rounded-xl border border-neutral-200 bg-neutral-50 p-3 hover:bg-neutral-100 hover:border-neutral-900 transition active:scale-98 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-neutral-400">
                  Option {idx + 1}
                </span>
                {place.distanceMeters && (
                  <span className="text-xs font-bold text-blue-700">
                    {place.distanceMeters}m away
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-neutral-900 truncate mt-0.5">
                {place.name}
              </div>
              <div className="text-[11px] text-neutral-500 truncate">{place.displayName}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 3. Active Walking Navigation Guidance
  if (!isNavigating || !route) {
    return null;
  }

  const currentStep = route.steps[route.currentStepIndex];
  const nextStep = route.steps[route.currentStepIndex + 1];
  const timeMinutes = Math.max(1, Math.round(route.durationSeconds / 60));

  return (
    <div
      role="region"
      aria-label="Active Walking Turn by Turn Navigation"
      className="rounded-2xl border-2 border-neutral-900 bg-white p-4 shadow-sm"
    >
      {/* Destination Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-blue-600 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Walking to:
          </span>
          <span className="text-xs font-black text-neutral-900 truncate max-w-[160px]">
            {route.destinationName}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
          <span>{route.distanceMeters}m</span>
          <span>•</span>
          <span>~{timeMinutes} min</span>
        </div>
      </div>

      {/* Main Step Instruction */}
      <div className="flex items-start gap-3 rounded-xl bg-neutral-50 border border-neutral-200 p-3 mb-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-neutral-300 shadow-sm">
          {getManeuverIcon(currentStep?.modifier, currentStep?.maneuverType)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
            Current Turn
          </div>
          <p className="text-base font-black text-neutral-900 leading-snug">
            {currentStep?.instruction || 'Proceed along path'}
          </p>
        </div>
      </div>

      {/* Next Step Preview */}
      {nextStep && (
        <div className="flex items-center gap-2 text-xs text-neutral-600 mb-3 px-1">
          <span className="font-bold text-neutral-400 uppercase">Next:</span>
          <span className="truncate">{nextStep.instruction}</span>
        </div>
      )}

      {/* Navigation Controls Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
        <button
          onClick={onRepeatInstruction}
          aria-label="Repeat current navigation instruction"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white py-2 text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Repeat Turn</span>
        </button>

        <button
          onClick={onOpenPhoneMap}
          aria-label="Open route in phone native map application"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white py-2 text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
        >
          <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
          <span>Phone Maps</span>
        </button>

        <button
          onClick={onRecalculate}
          aria-label="Recalculate walking route"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white py-2 text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Recalculate</span>
        </button>

        <button
          onClick={onStopNavigation}
          aria-label="Stop navigation"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
        >
          <XCircle className="h-3.5 w-3.5 text-red-400" />
          <span>Stop Nav</span>
        </button>
      </div>
    </div>
  );
};
