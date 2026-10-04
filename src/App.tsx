import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { CameraFeed } from './components/CameraFeed';
import { NavigationDisplay } from './components/NavigationDisplay';
import { ModeSelector } from './components/ModeSelector';
import { VoiceAssistantBar } from './components/VoiceAssistantBar';
import { SetupModal } from './components/SetupModal';
import { EmergencyModal } from './components/EmergencyModal';
import { NavigationSearchModal } from './components/NavigationSearchModal';
import { SettingsModal } from './components/SettingsModal';
import { LanguageModal } from './components/LanguageModal';
import { OfflineIndicator } from './pwa/OfflineIndicator';
import { useOnlineStatus } from './pwa/useOnlineStatus';

import { cameraManager } from './camera/CameraManager';
import { speechManager } from './voice/SpeechManager';
import { speechRecognitionManager } from './voice/SpeechRecognitionManager';
import { visionEngine } from './vision/VisionEngine';
import { navigationManager } from './navigation/NavigationManager';
import { audioOutputManager } from './utils/audioOutputManager';
import { notificationManager } from './utils/notificationManager';

import {
  AppMode,
  DetectedObject,
  DeviceStatus,
  NavigationRoute,
  SearchResultPlace,
  UserCoordinates,
  AppLanguage,
  SUPPORTED_LANGUAGES,
} from './types';

export default function App() {
  const isOnline = useOnlineStatus();

  // Mode and Assistance State
  const [currentMode, setCurrentMode] = useState<AppMode>('assist');
  const [isAssistanceActive, setIsAssistanceActive] = useState<boolean>(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [lastSpokenText, setLastSpokenText] = useState<string>('');
  const [currentTranscript, setCurrentTranscript] = useState<string>('');

  // Device Statuses
  const [cameraStatus, setCameraStatus] = useState<'connected' | 'disconnected' | 'denied' | 'requesting'>(
    'disconnected'
  );
  const [micStatus, setMicStatus] = useState<'ready' | 'listening' | 'disconnected' | 'denied' | 'requesting'>(
    'disconnected'
  );
  const [gpsStatus, setGpsStatus] = useState<'available' | 'unavailable' | 'denied' | 'requesting'>('unavailable');
  const [bluetoothStatus, setBluetoothStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [aiStatus, setAiStatus] = useState<'ready' | 'processing' | 'error' | 'unavailable'>('ready');

  // Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [navRoute, setNavRoute] = useState<NavigationRoute | null>(null);
  const [currentCoords, setCurrentCoords] = useState<UserCoordinates | null>(null);
  const [searchCandidates, setSearchCandidates] = useState<SearchResultPlace[] | null>(null);
  const [pendingDestination, setPendingDestination] = useState<SearchResultPlace | null>(null);

  // User Settings State (Local Storage)
  const [homeAddress, setHomeAddress] = useState<string>(() => {
    return localStorage.getItem('vg_home_address') || '';
  });
  const [emergencyName, setEmergencyName] = useState<string>(() => {
    return localStorage.getItem('vg_emergency_name') || 'Emergency Contact';
  });
  const [emergencyPhone, setEmergencyPhone] = useState<string>(() => {
    return localStorage.getItem('vg_emergency_phone') || '911';
  });

  // Language State
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    return localStorage.getItem('vg_language') || 'en-US';
  });
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  // Modal Visibility
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(() => {
    return !localStorage.getItem('vg_setup_completed');
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isNavSearchOpen, setIsNavSearchOpen] = useState(false);

  const handleSelectLanguage = useCallback((lang: AppLanguage) => {
    setCurrentLanguage(lang.code);
    localStorage.setItem('vg_language', lang.code);
    speechManager.setLanguage(lang.code);
    speechRecognitionManager.setLanguage(lang.code);
    visionEngine.setLanguage(lang.code);

    let confirmation = `Language changed to ${lang.name}.`;
    if (lang.code.startsWith('hi')) {
      confirmation = `भाषा हिंदी में सेट की गई है।`;
    } else if (lang.code.startsWith('mr')) {
      confirmation = `भाषा मराठी मध्ये सेट केली आहे.`;
    } else if (lang.code.startsWith('es')) {
      confirmation = `Idioma cambiado a español.`;
    } else if (lang.code.startsWith('fr')) {
      confirmation = `Langue changée en français.`;
    } else if (lang.code.startsWith('de')) {
      confirmation = `Sprache auf Deutsch geändert.`;
    } else if (lang.code.startsWith('ja')) {
      confirmation = `言語を日本語に切り替えました。`;
    } else if (lang.code.startsWith('ar')) {
      confirmation = `تم تغيير اللغة إلى العربية.`;
    }
    speechManager.speak(confirmation, 4, true);
  }, []);

  // Sync initial language
  useEffect(() => {
    const saved = localStorage.getItem('vg_language') || 'en-US';
    speechManager.setLanguage(saved);
    speechRecognitionManager.setLanguage(saved);
    visionEngine.setLanguage(saved);
  }, []);

  // References for latest state inside voice callbacks
  const isNavigatingRef = useRef(isNavigating);
  isNavigatingRef.current = isNavigating;
  const isAssistanceActiveRef = useRef(isAssistanceActive);
  isAssistanceActiveRef.current = isAssistanceActive;
  const pendingDestRef = useRef(pendingDestination);
  pendingDestRef.current = pendingDestination;
  const searchCandidatesRef = useRef(searchCandidates);
  searchCandidatesRef.current = searchCandidates;

  // 1. Initialize Subsystems & Listeners
  useEffect(() => {
    // Camera Status Listener
    const unsubCamera = cameraManager.onStatusChange((status) => {
      setCameraStatus(status);
    });

    // Mic Status Listener
    const unsubMic = speechRecognitionManager.onStatusChange((status) => {
      setMicStatus(status);
    });

    // Spoken Manager Feedback Listener
    const unsubSpeech = speechManager.subscribe((msg) => {
      setLastSpokenText(msg);
    });

    // Bluetooth / Earbud Audio Output Listener
    const unsubAudio = audioOutputManager.subscribe((status) => {
      setBluetoothStatus(status);
    });

    // Navigation State Listener
    const unsubNav = navigationManager.subscribe((navState) => {
      setIsNavigating(navState.isNavigating);
      setNavRoute(navState.route);
      setCurrentCoords(navState.currentCoords);
      setGpsStatus(navState.status);
      setSearchCandidates(navState.searchCandidates);
      setPendingDestination(navState.pendingDestination);
    });

    // Vision Engine Detection Listener
    const unsubVision = visionEngine.onDetection((objects) => {
      setDetectedObjects(objects);
      setAiStatus('ready');
    });

    // PWA Section 44: Foreground recovery when browser unfreezes/resumes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isAssistanceActiveRef.current && !cameraManager.isConnected()) {
          cameraManager.start('environment').then((ok) => {
            if (ok) {
              speechManager.speak('VisionGuide resumed.', 4);
              visionEngine.startLoop('assist');
            }
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubCamera();
      unsubMic();
      unsubSpeech();
      unsubAudio();
      unsubNav();
      unsubVision();
    };
  }, []);

  // Sync navigation context with vision engine for walking path awareness
  useEffect(() => {
    if (navRoute && isNavigating) {
      const step = navRoute.steps[navRoute.currentStepIndex];
      visionEngine.setWalkingContext(
        `Walking to ${navRoute.destinationName}. Current maneuver: ${step?.instruction || 'continue'}`
      );
    } else {
      visionEngine.setWalkingContext('Standing or general walking path');
    }
  }, [navRoute, isNavigating]);

  // 2. Start Assistance Action
  const handleStartAssistance = useCallback(async () => {
    speechManager.speak('AI assistance started.', 3, true);
    setIsAssistanceActive(true);
    setCurrentMode('assist');

    // Start physical camera
    const started = await cameraManager.start('environment');
    if (started) {
      speechManager.speak('Camera connected.', 4);
      visionEngine.startLoop('assist');
      setAiStatus('processing');
    } else {
      speechManager.speak(
        'Camera access is unavailable. Please allow camera permission.',
        2,
        true
      );
    }

    // Start hands-free speech recognition
    speechRecognitionManager.start();
  }, []);

  // 3. Stop Assistance Action
  const handleStopAssistance = useCallback(() => {
    setIsAssistanceActive(false);
    visionEngine.stopLoop();
    cameraManager.stop();
    speechManager.speak('AI assistance stopped.', 3, true);
    setDetectedObjects([]);
  }, []);

  const handleToggleAssistance = useCallback(() => {
    if (isAssistanceActive) {
      handleStopAssistance();
    } else {
      handleStartAssistance();
    }
  }, [isAssistanceActive, handleStartAssistance, handleStopAssistance]);

  // 4. Mode Selection (Read, Describe, Ask AI, Navigation, Emergency)
  const handleSelectMode = useCallback(
    async (mode: AppMode) => {
      setCurrentMode(mode);

      // Ensure camera is active for vision modes
      if (mode === 'read' || mode === 'describe' || mode === 'ask_ai') {
        if (!cameraManager.isConnected()) {
          const started = await cameraManager.start('environment');
          if (!started) {
            speechManager.speak('Camera access is required for vision modes.', 2, true);
            return;
          }
        }
      }

      if (mode === 'read') {
        speechManager.speak('Read mode. Point your camera at text or signboards.', 3, true);
        setAiStatus('processing');
        await visionEngine.sampleAndAnalyze('read');
        setAiStatus('ready');
      } else if (mode === 'describe') {
        speechManager.speak('Analyzing surroundings...', 3, true);
        setAiStatus('processing');
        await visionEngine.sampleAndAnalyze('describe');
        setAiStatus('ready');
      } else if (mode === 'ask_ai') {
        speechManager.speak('Ask AI mode. What would you like to know about your view?', 3, true);
      } else if (mode === 'emergency') {
        setIsEmergencyOpen(true);
      }
    },
    []
  );

  // 5. Voice Command Parser & Processor
  const handleVoiceCommand = useCallback(
    async (rawCommand: string) => {
      const cmd = rawCommand.toLowerCase().trim();
      setCurrentTranscript(rawCommand);

      // Clear transcript display after 4s
      setTimeout(() => setCurrentTranscript(''), 4000);

      // Pending Destination Confirmation ("yes" / "no")
      if (pendingDestRef.current) {
        if (cmd.includes('yes') || cmd.includes('start') || cmd.includes('sure') || cmd.includes('confirm')) {
          navigationManager.confirmPendingDestination(true);
          return;
        }
        if (cmd.includes('no') || cmd.includes('cancel') || cmd.includes('stop')) {
          navigationManager.confirmPendingDestination(false);
          return;
        }
      }

      // Candidate Selection ("the first one", "the second one", "option one")
      if (searchCandidatesRef.current && searchCandidatesRef.current.length > 0) {
        if (cmd.includes('first') || cmd.includes('one') || cmd.includes('1')) {
          navigationManager.selectCandidate(0);
          return;
        }
        if (cmd.includes('second') || cmd.includes('two') || cmd.includes('2')) {
          navigationManager.selectCandidate(1);
          return;
        }
        if (cmd.includes('third') || cmd.includes('three') || cmd.includes('3')) {
          navigationManager.selectCandidate(2);
          return;
        }
      }

      // Emergency Command
      if (cmd.includes('emergency') || cmd.includes('sos') || cmd.includes('help me')) {
        setIsEmergencyOpen(true);
        speechManager.speak('Emergency mode triggered. I can call your emergency contact.', 1, true);
        return;
      }

      // Repeat Command
      if (cmd.includes('repeat') || cmd.includes('what did you say') || cmd.includes('again')) {
        if (isNavigatingRef.current) {
          navigationManager.repeatInstruction();
        } else {
          speechManager.repeatLastMessage();
        }
        return;
      }

      // Start / Stop Assistance
      if (cmd.includes('start assistance') || cmd.includes('start assist') || cmd.includes('start vision')) {
        handleStartAssistance();
        return;
      }
      if (cmd.includes('stop assistance') || cmd.includes('stop assist') || cmd.includes('stop vision')) {
        handleStopAssistance();
        return;
      }

      // Language Switch Commands (e.g. "switch to Hindi", "change language to Marathi")
      if (
        cmd.includes('language') ||
        cmd.includes('switch to') ||
        cmd.includes('change to') ||
        cmd.includes('speak in') ||
        cmd.includes('bhasha')
      ) {
        if (cmd.includes('hindi')) {
          const l = SUPPORTED_LANGUAGES.find((x) => x.code === 'hi-IN');
          if (l) {
            handleSelectLanguage(l);
            return;
          }
        }
        if (cmd.includes('marathi')) {
          const l = SUPPORTED_LANGUAGES.find((x) => x.code === 'mr-IN');
          if (l) {
            handleSelectLanguage(l);
            return;
          }
        }
        if (cmd.includes('spanish') || cmd.includes('espanol') || cmd.includes('español')) {
          const l = SUPPORTED_LANGUAGES.find((x) => x.code === 'es-ES');
          if (l) {
            handleSelectLanguage(l);
            return;
          }
        }
        if (cmd.includes('french') || cmd.includes('francais') || cmd.includes('français')) {
          const l = SUPPORTED_LANGUAGES.find((x) => x.code === 'fr-FR');
          if (l) {
            handleSelectLanguage(l);
            return;
          }
        }
        if (cmd.includes('german') || cmd.includes('deutsch')) {
          const l = SUPPORTED_LANGUAGES.find((x) => x.code === 'de-DE');
          if (l) {
            handleSelectLanguage(l);
            return;
          }
        }
        if (cmd.includes('japanese')) {
          const l = SUPPORTED_LANGUAGES.find((x) => x.code === 'ja-JP');
          if (l) {
            handleSelectLanguage(l);
            return;
          }
        }
        if (cmd.includes('arabic')) {
          const l = SUPPORTED_LANGUAGES.find((x) => x.code === 'ar-SA');
          if (l) {
            handleSelectLanguage(l);
            return;
          }
        }
        if (cmd.includes('english')) {
          const l = SUPPORTED_LANGUAGES.find((x) => x.code === 'en-US');
          if (l) {
            handleSelectLanguage(l);
            return;
          }
        }
        if (cmd.includes('language') || cmd.includes('bhasha')) {
          setIsLanguageOpen(true);
          speechManager.speak('Select your preferred language.', 4, true);
          return;
        }
      }

      // Navigation Status Queries
      if (cmd.includes('next turn') || cmd.includes("what's the next turn") || cmd.includes('what is the next turn')) {
        navigationManager.announceNextTurn();
        return;
      }
      if (cmd.includes('how far') || cmd.includes('distance') || cmd.includes('how long')) {
        navigationManager.announceDistanceRemaining();
        return;
      }
      if (cmd.includes('stop navigation') || cmd.includes('cancel navigation') || cmd.includes('exit navigation')) {
        navigationManager.stopNavigation();
        return;
      }
      if (cmd.includes('pause navigation')) {
        navigationManager.pauseNavigation();
        return;
      }
      if (cmd.includes('resume navigation')) {
        navigationManager.resumeNavigation();
        return;
      }

      // Where am I / Location query
      if (cmd.includes('where am i') || cmd.includes('my location') || cmd.includes('current position')) {
        const coords = navigationManager.getCurrentCoords();
        if (coords) {
          speechManager.speak(
            `You are at approximate coordinates: latitude ${coords.latitude.toFixed(4)}, longitude ${coords.longitude.toFixed(4)}. Accuracy is within ${Math.round(coords.accuracy)} meters.`,
            3,
            true
          );
        } else {
          speechManager.speak('GPS location is currently unavailable. Please verify GPS permissions.', 3, true);
        }
        return;
      }

      // Read This / OCR Command
      if (cmd.includes('read') || cmd.includes('read this') || cmd.includes('read text') || cmd.includes('read sign')) {
        handleSelectMode('read');
        return;
      }

      // Describe Surroundings Command
      if (
        cmd.includes('describe') ||
        cmd.includes("what's ahead") ||
        cmd.includes('what is ahead') ||
        cmd.includes('what is around me') ||
        cmd.includes("what's around me") ||
        cmd.includes('surroundings')
      ) {
        handleSelectMode('describe');
        return;
      }

      // Take Me Home Command
      if (cmd.includes('take me home') || cmd.includes('go home') || cmd.includes('navigate home')) {
        if (!homeAddress) {
          speechManager.speak(
            'Your home address is not configured. Please set your home address in settings.',
            3,
            true
          );
          setIsSettingsOpen(true);
        } else {
          navigationManager.handleDestinationRequest(homeAddress);
        }
        return;
      }

      // "I want to go to [destination]" or "Take me to [destination]" or "Navigate to [destination]"
      const destPatterns = [
        /(?:i want to go to|take me to|navigate to|go to|find the nearest|find a nearest|find|directions to)\s+(.+)/i,
      ];
      for (const pattern of destPatterns) {
        const match = cmd.match(pattern);
        if (match && match[1]) {
          const dest = match[1].trim();
          navigationManager.handleDestinationRequest(dest);
          return;
        }
      }

      // General "What is this?" or Ask AI
      if (cmd.includes('what is this') || cmd.includes('what is that') || cmd.includes('ask ai')) {
        setCurrentMode('ask_ai');
        speechManager.speak('Examining object...', 4);
        setAiStatus('processing');
        await visionEngine.sampleAndAnalyze('ask_ai', rawCommand);
        setAiStatus('ready');
        return;
      }

      // If user asks generic question while in ask_ai mode
      if (currentMode === 'ask_ai') {
        setAiStatus('processing');
        await visionEngine.sampleAndAnalyze('ask_ai', rawCommand);
        setAiStatus('ready');
        return;
      }
    },
    [homeAddress, handleSelectMode, handleStartAssistance, handleStopAssistance, currentMode]
  );

  // 6. Connect Speech Recognition Transcripts
  useEffect(() => {
    const unsub = speechRecognitionManager.onTranscript((text, isFinal) => {
      setCurrentTranscript(text);
      if (isFinal) {
        handleVoiceCommand(text);
      }
    });
    return () => {
      unsub();
    };
  }, [handleVoiceCommand]);

  // 7. Toggle Mic push/listen
  const handleToggleMic = () => {
    if (micStatus === 'listening') {
      speechRecognitionManager.stop();
      speechManager.speak('Microphone paused.', 4);
    } else {
      speechRecognitionManager.start();
      speechManager.speak('Microphone listening.', 4);
    }
  };

  // 8. Save Settings handlers
  const handleSaveHome = (val: string) => {
    setHomeAddress(val);
    localStorage.setItem('vg_home_address', val);
  };

  const handleSaveEmergency = (name: string, phone: string) => {
    setEmergencyName(name);
    setEmergencyPhone(phone);
    localStorage.setItem('vg_emergency_name', name);
    localStorage.setItem('vg_emergency_phone', phone);
  };

  const handleSetupComplete = (homeInput: string) => {
    if (homeInput) {
      handleSaveHome(homeInput);
    }
    localStorage.setItem('vg_setup_completed', 'true');
    setIsSetupOpen(false);
  };

  const deviceStatus: DeviceStatus = {
    camera: cameraStatus,
    microphone: micStatus,
    gps: gpsStatus,
    internet: isOnline ? 'connected' : 'offline',
    bluetooth: bluetoothStatus,
    ai: aiStatus,
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      {/* 1. Accessible Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main assistance content
      </a>

      {/* 2. Top Header with Install, Language, Emergency, Repeat, Settings */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLanguage={() => setIsLanguageOpen(true)}
        currentLanguage={currentLanguage}
        onOpenEmergency={() => {
          speechManager.speak('Emergency mode opened.', 2, true);
          setIsEmergencyOpen(true);
        }}
      />

      {/* 3. System Connection & Mode Status Bar */}
      <StatusBar status={deviceStatus} currentMode={currentMode} />

      {/* 4. Main Scrollable Container */}
      <main id="main-content" className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Physical Rear Camera Feed with Obstacle Visuals */}
        <CameraFeed
          cameraStatus={cameraStatus}
          detectedObjects={detectedObjects}
          onStartCamera={async () => {
            await cameraManager.start('environment');
          }}
          isAssistanceActive={isAssistanceActive}
        />

        {/* Active Walking Navigation Turn-by-Turn Display */}
        <NavigationDisplay
          route={navRoute}
          isNavigating={isNavigating}
          searchCandidates={searchCandidates}
          pendingDestination={pendingDestination}
          onConfirmDestination={(accepted) => navigationManager.confirmPendingDestination(accepted)}
          onSelectCandidate={(idx) => navigationManager.selectCandidate(idx)}
          onRepeatInstruction={() => navigationManager.repeatInstruction()}
          onStopNavigation={() => navigationManager.stopNavigation()}
          onRecalculate={() => navigationManager.recalculateRoute()}
          onOpenPhoneMap={() => navigationManager.openExternalMap()}
        />

        {/* Primary Mode Controls: ASSIST / NAVIGATION / READ / DESCRIBE / ASK AI / EMERGENCY */}
        <ModeSelector
          currentMode={currentMode}
          isAssistanceActive={isAssistanceActive}
          onToggleAssistance={handleToggleAssistance}
          onSelectMode={handleSelectMode}
          onOpenEmergency={() => setIsEmergencyOpen(true)}
          onOpenNavigationSearch={() => setIsNavSearchOpen(true)}
        />
      </main>

      {/* 5. Voice Interaction Bar (Voice-First Experience) */}
      <VoiceAssistantBar
        micStatus={micStatus}
        currentTranscript={currentTranscript}
        lastSpokenText={lastSpokenText}
        onToggleMic={handleToggleMic}
        onQuickCommand={(cmd) => handleVoiceCommand(cmd)}
      />

      {/* 6. Offline Status Toast */}
      <OfflineIndicator />

      {/* 7. Setup Modal (First-Launch Walkthrough) */}
      <SetupModal
        isOpen={isSetupOpen}
        onComplete={handleSetupComplete}
        onRequestCamera={async () => cameraManager.start('environment')}
        onRequestMic={() => speechRecognitionManager.start()}
        onRequestGps={() => navigationManager.initGps()}
        cameraStatus={cameraStatus}
        micStatus={micStatus}
        gpsStatus={gpsStatus}
        bluetoothStatus={bluetoothStatus}
      />

      {/* 8. Emergency Mode Modal */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        coords={currentCoords}
        contactName={emergencyName}
        contactPhone={emergencyPhone}
      />

      {/* 9. Navigation Search Modal */}
      <NavigationSearchModal
        isOpen={isNavSearchOpen}
        onClose={() => setIsNavSearchOpen(false)}
        onSearch={(destination) => navigationManager.handleDestinationRequest(destination)}
        homeAddress={homeAddress}
      />

      {/* 10. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        homeAddress={homeAddress}
        onSaveHome={handleSaveHome}
        emergencyName={emergencyName}
        emergencyPhone={emergencyPhone}
        onSaveEmergency={handleSaveEmergency}
        onRerunSetup={() => setIsSetupOpen(true)}
        currentLanguage={currentLanguage}
        onSelectLanguage={handleSelectLanguage}
      />

      {/* 11. Dedicated Language Modal */}
      <LanguageModal
        isOpen={isLanguageOpen}
        onClose={() => setIsLanguageOpen(false)}
        currentLanguage={currentLanguage}
        onSelectLanguage={handleSelectLanguage}
      />
    </div>
  );
}
