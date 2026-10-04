import React from 'react';
import { Phone, MessageSquare, MapPin, X, AlertOctagon, Share2 } from 'lucide-react';
import { UserCoordinates } from '../types';
import { speechManager } from '../voice/SpeechManager';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  coords: UserCoordinates | null;
  contactName: string;
  contactPhone: string;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  coords,
  contactName,
  contactPhone,
}) => {
  if (!isOpen) return null;

  const locationText = coords
    ? `Latitude: ${coords.latitude.toFixed(5)}, Longitude: ${coords.longitude.toFixed(5)} (Accuracy: ~${Math.round(
        coords.accuracy
      )}m)`
    : 'GPS coordinates currently pending';

  const mapsLink = coords
    ? `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`
    : '';

  const handleCall = () => {
    speechManager.speak(`Calling ${contactName || 'Emergency contact'}.`, 1, true);
    window.location.href = `tel:${contactPhone || '911'}`;
  };

  const handleSms = () => {
    const body = encodeURIComponent(
      `EMERGENCY: I need assistance. My current location is: ${mapsLink || locationText}`
    );
    speechManager.speak('Opening emergency SMS message.', 2, true);
    window.location.href = `sms:${contactPhone || ''}?body=${body}`;
  };

  const handleShareLocation = async () => {
    if (navigator.share && mapsLink) {
      try {
        await navigator.share({
          title: 'My Emergency Location',
          text: `I need assistance. Here is my current GPS location:`,
          url: mapsLink,
        });
      } catch (err) {
        console.warn('Share error:', err);
      }
    } else if (mapsLink) {
      navigator.clipboard.writeText(mapsLink);
      speechManager.speak('Location link copied to clipboard.', 3, true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border-4 border-red-600 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div className="flex items-center gap-2 text-red-600">
            <AlertOctagon className="h-6 w-6 animate-pulse" />
            <h2 id="emergency-dialog-title" className="text-lg font-black tracking-tight text-neutral-900">
              EMERGENCY MODE
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close emergency modal"
            className="rounded-xl p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Location Box */}
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-neutral-500 mb-1">
            <MapPin className="h-4 w-4 text-red-500" />
            <span>Current Emergency Coordinates</span>
          </div>
          <p className="text-xs font-semibold text-neutral-800 leading-snug">{locationText}</p>
        </div>

        {/* Emergency Actions */}
        <div className="mt-5 space-y-2.5">
          {/* Direct Call */}
          <button
            onClick={handleCall}
            aria-label={`Call emergency contact: ${contactName || 'Primary contact'}`}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-red-600 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-md hover:bg-red-700 transition active:scale-95 focus:ring-4 focus:ring-red-600 focus:outline-none"
          >
            <Phone className="h-5 w-5" />
            <span>Call {contactName || 'Emergency Contact'}</span>
          </button>

          {/* Send SMS SOS */}
          <button
            onClick={handleSms}
            aria-label="Send emergency text message with your GPS coordinates"
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl border-2 border-neutral-900 bg-white py-3 text-sm font-bold text-neutral-900 hover:bg-neutral-50 transition active:scale-95 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
          >
            <MessageSquare className="h-4 w-4 text-neutral-900" />
            <span>Send SOS SMS with Location</span>
          </button>

          {/* Share Location Link */}
          {mapsLink && (
            <button
              onClick={handleShareLocation}
              aria-label="Share current GPS location"
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition active:scale-95"
            >
              <Share2 className="h-4 w-4 text-neutral-600" />
              <span>Share Location Link</span>
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition"
        >
          Cancel &amp; Return to Main Screen
        </button>
      </div>
    </div>
  );
};
