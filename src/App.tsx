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
import { VoiceHelpModal } from './components/VoiceHelpModal';
import { DetectionPanel } from './components/DetectionPanel';
import { DetectionSettings } from './components/DetectionSettings';
import { ProximityWarning } from './components/ProximityWarning';
import { OfflineIndicator } from './pwa/OfflineIndicator';
import { useOnlineStatus } from './pwa/useOnlineStatus';

import { cameraManager } from './camera/CameraManager';
import { audioManager } from './voice/AudioManager';
import { speechRecognitionManager, VoiceSessionState } from './voice/SpeechRecognitionManager';
import { CommandRouter } from './voice/CommandRouter';
import { visionEngine } from './vision/VisionEngine';
import { navigationManager } from './navigation/NavigationManager';
import { audioOutputManager } from './utils/audioOutputManager';
import { useObjectDetection } from './hooks/useObjectDetection';

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
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mode and Assistance State (4 core modes: assist, navigation, read, describe, emergency)
  const [currentMode, setCurrentMode] = useState<AppMode>('assist');
  const [isAssistanceActive, setIsAssistanceActive] = useState<boolean>(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [lastSpokenText, setLastSpokenText] = useState<string>('');
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [voiceSessionState, setVoiceSessionState] = useState<VoiceSessionState>('IDLE');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

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

  // Real-Time Browser-Native Object Detection Hook
  const {
    detections: realTimeDetections,
    detectionHistory,
    settings: detectionSettings,
    fps: detectionFps,
    isModelLoaded,
    isModelLoading,
    modelError: detectionModelError,
    objectCounts,
    updateSettings: updateDetectionSettings,
    clearHistory: clearDetectionHistory,
  } = useObjectDetection({
    videoRef,
    cameraStatus,
  });

  const [isDetectionSettingsOpen, setIsDetectionSettingsOpen] = useState(false);

  // Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [navRoute, setNavRoute] = useState<NavigationRoute | null>(null);
  const [currentCoords, setCurrentCoords] = useState<UserCoordinates | null>(null);
  const [searchCandidates, setSearchCandidates] = useState<SearchResultPlace[] | null>(null);
  const [pendingDestination, setPendingDestination] = useState<SearchResultPlace | null>(null);
  const [pendingDestinationText, setPendingDestinationText] = useState<string | null>(null);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);

  // Diagnostics panel visibility
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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
    return localStorage.getItem('vg_language') || 'en-IN';
  });
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
    audioManager.setLanguage(lang.code);
    speechRecognitionManager.setLanguage(lang.code);
    visionEngine.setLanguage(lang.code);

    let confirmation = `Language changed to ${lang.name}.`;
    if (lang.code.startsWith('hi')) {
      confirmation = `भाषा हिंदी में सेट की गई है।`;
    } else if (lang.code.startsWith('mr')) {
      confirmation = `भाषा मराठी मध्ये सेट केली आहे।`;
    } else if (lang.code.startsWith('gu')) {
      confirmation = `ભાષા ગુજરાતીમાં સેટ થઈ ગઈ છે.`;
    } else if (lang.code.startsWith('bn')) {
      confirmation = `ভাষা বাংলায় সেট করা হয়েছে।`;
    } else if (lang.code.startsWith('ta')) {
      confirmation = `மொழி தமிழாக மாற்றப்பட்டது.`;
    } else if (lang.code.startsWith('te')) {
      confirmation = `భాష తెలుగుకి మార్చబడింది.`;
    } else if (lang.code.startsWith('kn')) {
      confirmation = `ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.`;
    } else if (lang.code.startsWith('ml')) {
      confirmation = `ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി.`;
    } else if (lang.code.startsWith('pa')) {
      confirmation = `ਭਾਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਬਦਲੀ ਗਈ ਹੈ।`;
    } else if (lang.code.startsWith('ur')) {
      confirmation = `زبان اردو میں تبدیل کر دی گئی ہے۔`;
    }
    audioManager.speak(confirmation, 4, true);
  }, []);

  // Sync initial language
  useEffect(() => {
    const saved = localStorage.getItem('vg_language') || 'en-IN';
    audioManager.setLanguage(saved);
    speechRecognitionManager.setLanguage(saved);
    visionEngine.setLanguage(saved);
  }, []);

  // References for latest state inside voice callbacks
  const isNavigatingRef = useRef(isNavigating);
  isNavigatingRef.current = isNavigating;
  const isAssistanceActiveRef = useRef(isAssistanceActive);
  isAssistanceActiveRef.current = isAssistanceActive;
  const waitingForConfirmationRef = useRef(waitingForConfirmation);
  waitingForConfirmationRef.current = waitingForConfirmation;
  const currentModeRef = useRef(currentMode);
  currentModeRef.current = currentMode;

  // 1. Initialize Subsystems & Listeners
  useEffect(() => {
    const unsubCamera = cameraManager.onStatusChange((status) => {
      setCameraStatus(status);
    });

    const unsubMic = speechRecognitionManager.onStatusChange((status) => {
      setMicStatus(status);
    });

    const unsubVoiceState = speechRecognitionManager.onSessionStateChange((state) => {
      setVoiceSessionState(state);
    });

    const unsubSpeech = audioManager.subscribe((msg) => {
      setLastSpokenText(msg);
    });

    const unsubSpeaking = audioManager.onSpeakingChange((speaking) => {
      setIsSpeaking(speaking);
    });

    const unsubAudio = audioOutputManager.subscribe((status) => {
      setBluetoothStatus(status);
    });

    const unsubVision = visionEngine.onDetection((objects) => {
      setDetectedObjects(objects);
    });

    const unsubNav = navigationManager.subscribe((navState) => {
      setIsNavigating(navState.isNavigating);
      setNavRoute(navState.route);
      setCurrentCoords(navState.currentCoords);
      setGpsStatus(navState.status);
      setSearchCandidates(navState.searchCandidates);
      setPendingDestination(navState.pendingDestination);
      setPendingDestinationText(navState.pendingDestinationText);
      setWaitingForConfirmation(navState.waitingForConfirmation);
    });

    return () => {
      unsubCamera();
      unsubMic();
      unsubVoiceState();
      unsubSpeech();
      unsubSpeaking();
      unsubAudio();
      unsubVision();
      unsubNav();
    };
  }, []);

  // 2. Start Assistance (Starts camera and initiates continuous microphone listening)
  const handleStartAssistance = useCallback(async () => {
    audioManager.speak('Starting Vision AI assistant. Activating camera.', 4, true);

    const cameraStarted = await cameraManager.start('environment');
    if (!cameraStarted) {
      audioManager.speak(
        'Camera access was denied or is unavailable. Please enable camera permissions or use the test feed.',
        2,
        true
      );
    }

    visionEngine.startLoop(currentModeRef.current);
    setIsAssistanceActive(true);
    setAiStatus('ready');

    // Continuous listening starts immediately and stays active across all commands until Stop is clicked
    await speechRecognitionManager.startContinuousListening(true);
    audioManager.speak('Microphone is listening continuously. Say any command hands-free.', 4, false);
  }, []);

  // 3. Stop Assistance (The ONLY action that stops the continuous microphone mode)
  const handleStopAssistance = useCallback(() => {
    // 1. Completely stop speech recognition and release mic tracks
    speechRecognitionManager.stopContinuousListening();

    // 2. Stop camera and vision loop
    visionEngine.stopLoop();
    cameraManager.stop();

    // 3. Update state
    setIsAssistanceActive(false);
    setDetectedObjects([]);

    audioManager.speak('Vision AI assistant stopped. Microphone stopped.', 4, true);
  }, []);

  const handleToggleAssistance = () => {
    if (isAssistanceActive) {
      handleStopAssistance();
    } else {
      handleStartAssistance();
    }
  };

  // 4. Select Card Mode
  const handleSelectMode = useCallback(
    async (mode: AppMode) => {
      setCurrentMode(mode);

      if (mode === 'read' || mode === 'describe') {
        if (!cameraManager.isConnected()) {
          const started = await cameraManager.start('environment');
          if (!started) {
            audioManager.speak('Camera access is required for vision modes.', 2, true);
            return;
          }
        }
      }

      if (mode === 'navigation') {
        audioManager.speak('Navigation mode activated. Where would you like to walk?', 3, true);
        setIsNavSearchOpen(true);
      } else if (mode === 'read') {
        audioManager.speak('Read text mode. Analyzing camera frame for visible text.', 4, true);
        setAiStatus('processing');
        await visionEngine.readText();
        setAiStatus('ready');
      } else if (mode === 'describe') {
        audioManager.speak('Analyzing surroundings...', 4, true);
        setAiStatus('processing');
        await visionEngine.describeSurroundings();
        setAiStatus('ready');
      } else if (mode === 'emergency') {
        audioManager.speak('Emergency mode opened.', 1, true);
        setIsEmergencyOpen(true);
      }
    },
    []
  );

  // 5. Intelligent Voice Command Handler (Microphone automatically continues listening after command execution!)
  const handleVoiceCommand = useCallback(
    async (rawCommand: string) => {
      if (!rawCommand || !rawCommand.trim()) return;

      setCurrentTranscript(rawCommand);
      setTimeout(() => setCurrentTranscript(''), 4500);

      const intent = CommandRouter.parse(rawCommand);

      // Emergency
      if (intent.type === 'EMERGENCY') {
        setIsEmergencyOpen(true);
        audioManager.speak('Emergency mode triggered. Help is available.', 1, true);
        return;
      }

      // Stop speech
      if (intent.type === 'STOP_SPEECH') {
        audioManager.stop();
        return;
      }

      // Repeat
      if (intent.type === 'REPEAT_LAST') {
        if (isNavigatingRef.current) {
          navigationManager.repeatInstruction();
        } else {
          audioManager.repeatLastMessage();
        }
        return;
      }

      // Navigation Confirmation
      if (waitingForConfirmationRef.current) {
        if (intent.type === 'CONFIRM_NAVIGATION') {
          navigationManager.confirmPendingDestination(true);
          return;
        }
        if (intent.type === 'CANCEL_NAVIGATION') {
          navigationManager.confirmPendingDestination(false);
          return;
        }
      }

      // Go to Object Detection Section
      if (intent.type === 'GO_TO_OBJECT_DETECTION') {
        const section = document.getElementById('object-detection-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
        audioManager.speak('Navigated to object detection section.', 4, true);
        return;
      }

      // Start Camera
      if (intent.type === 'START_CAMERA') {
        await cameraManager.start('environment');
        audioManager.speak('Camera started.', 4, true);
        return;
      }

      // Stop Camera
      if (intent.type === 'STOP_CAMERA') {
        cameraManager.stop();
        audioManager.speak('Camera stopped.', 4, true);
        return;
      }

      // Go Back
      if (intent.type === 'GO_BACK') {
        setCurrentMode('assist');
        audioManager.speak('Returned to main assistance view.', 4, true);
        return;
      }

      // Help
      if (intent.type === 'HELP') {
        setIsHelpOpen(true);
        const text =
          'Available commands include: Go to object detection, Go to navigation, Start camera, Read text, Describe this, Emergency, Stop, Repeat, and Take me to your destination.';
        audioManager.speak(text, 4, true);
        return;
      }

      // Camera Switch
      if (intent.type === 'SWITCH_CAMERA') {
        if (intent.target === 'user') {
          await cameraManager.switchToLaptopCamera();
          audioManager.speak('Switched to laptop webcam.', 4, true);
        } else if (intent.target === 'environment') {
          await cameraManager.switchToRearCamera();
          audioManager.speak('Switched to rear camera.', 4, true);
        } else {
          await cameraManager.toggleCamera();
          audioManager.speak('Camera toggled.', 4, true);
        }
        return;
      }

      // Start / Stop Assistant
      if (intent.type === 'START_ASSIST') {
        handleStartAssistance();
        return;
      }
      if (intent.type === 'STOP_ASSIST') {
        handleStopAssistance();
        return;
      }

      // Modes
      if (intent.type === 'OPEN_NAVIGATION') {
        handleSelectMode('navigation');
        return;
      }
      if (intent.type === 'READ_TEXT') {
        handleSelectMode('read');
        return;
      }
      if (intent.type === 'DESCRIBE') {
        handleSelectMode('describe');
        return;
      }

      // Destination Navigation
      if (intent.type === 'NAVIGATE_TO') {
        setCurrentMode('navigation');
        navigationManager.handleDestinationRequest(intent.destination);
        return;
      }

      // Multilingual
      if (intent.type === 'CHANGE_LANGUAGE') {
        const lang = SUPPORTED_LANGUAGES.find((l) => l.code === intent.languageCode);
        if (lang) {
          handleSelectLanguage(lang);
        }
        return;
      }

      // Queries
      const lower = rawCommand.toLowerCase();
      if (lower.includes('next turn')) {
        navigationManager.announceNextTurn();
        return;
      }
      if (lower.includes('how far') || lower.includes('how long')) {
        navigationManager.announceDistanceRemaining();
        return;
      }
      if (lower.includes('stop navigation')) {
        navigationManager.stopNavigation();
        return;
      }
      if (lower.includes('where am i')) {
        const coords = navigationManager.getCurrentCoords();
        if (coords) {
          audioManager.speak(
            `You are at latitude ${coords.latitude.toFixed(4)}, longitude ${coords.longitude.toFixed(4)}. Accuracy within ${Math.round(coords.accuracy)} meters.`,
            3,
            true
          );
        } else {
          audioManager.speak('GPS location is currently unavailable. Please verify location permissions.', 3, true);
        }
        return;
      }
      if (lower.includes('take me home')) {
        if (!homeAddress) {
          audioManager.speak('Home address is not configured. Please enter your home address.', 3, true);
          setIsSettingsOpen(true);
        } else {
          navigationManager.handleDestinationRequest(homeAddress);
        }
        return;
      }

      if (currentModeRef.current === 'read') {
        visionEngine.readText();
      } else if (currentModeRef.current === 'describe') {
        visionEngine.describeSurroundings();
      } else {
        audioManager.speak(
          'Command recognized. Say "Help" for available voice commands, or "Take me to" followed by your destination.',
          4,
          false
        );
      }
    },
    [handleSelectMode, handleStartAssistance, handleStopAssistance, handleSelectLanguage, homeAddress]
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

  // 7. Toggle Mic
  const handleToggleMic = async () => {
    if (speechRecognitionManager.isContinuousListening()) {
      speechRecognitionManager.stopContinuousListening();
      audioManager.speak('Microphone stopped.', 4, true);
    } else {
      await speechRecognitionManager.startContinuousListening(true);
      audioManager.speak('Microphone listening continuously.', 4, true);
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

  const isContinuous = speechRecognitionManager.isContinuousListening();

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
          audioManager.speak('Emergency mode opened.', 1, true);
          setIsEmergencyOpen(true);
        }}
      />

      {/* 3. System Connection & Mode Status Bar */}
      <StatusBar status={deviceStatus} currentMode={currentMode} />

      {/* 4. Main Scrollable Container */}
      <main id="main-content" className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Proximity Warning Alert if any obstacle is < 1.5m */}
        <ProximityWarning detections={realTimeDetections} />

        {/* Live Device Camera Feed (Rear Camera or Laptop Webcam) with Real-Time Bounding Boxes */}
        <CameraFeed
          videoRef={videoRef}
          cameraStatus={cameraStatus}
          detectedObjects={detectedObjects}
          realTimeDetections={realTimeDetections}
          detectionSettings={detectionSettings}
          onStartCamera={async () => {
            await cameraManager.start('environment');
          }}
          isAssistanceActive={isAssistanceActive}
        />

        {/* Real-Time In-Browser AI Object Detection Panel with id for smooth scrolling */}
        <div id="object-detection-section">
          <DetectionPanel
            detections={realTimeDetections}
            history={detectionHistory}
            objectCounts={objectCounts}
            fps={detectionFps}
            isModelLoaded={isModelLoaded}
            isModelLoading={isModelLoading}
            modelError={detectionModelError}
            settings={detectionSettings}
            onOpenSettings={() => setIsDetectionSettingsOpen(true)}
            onClearHistory={clearDetectionHistory}
          />
        </div>

        {/* Active Walking Navigation Turn-by-Turn Display & Google Maps Confirmation */}
        <NavigationDisplay
          route={navRoute}
          isNavigating={isNavigating}
          searchCandidates={searchCandidates}
          pendingDestination={pendingDestination}
          pendingDestinationText={pendingDestinationText}
          onConfirmDestination={(accepted) => navigationManager.confirmPendingDestination(accepted)}
          onSelectCandidate={(idx) => {
            if (searchCandidates && searchCandidates[idx]) {
              navigationManager.confirmPendingDestination(true);
            }
          }}
          onRepeatInstruction={() => navigationManager.repeatInstruction()}
          onStopNavigation={() => navigationManager.stopNavigation()}
          onRecalculate={() => {
            if (navRoute) {
              navigationManager.openGoogleMapsNavigation(navRoute.destinationName, navRoute.destinationCoords);
            }
          }}
          onOpenPhoneMap={() => navigationManager.openExternalMap()}
        />

        {/* Primary 4 Feature Cards: NAVIGATION / READ TEXT / DESCRIBE / EMERGENCY */}
        <ModeSelector
          currentMode={currentMode}
          isAssistanceActive={isAssistanceActive}
          onToggleAssistance={handleToggleAssistance}
          onSelectMode={handleSelectMode}
          onOpenEmergency={() => setIsEmergencyOpen(true)}
          onOpenNavigation={() => handleSelectMode('navigation')}
        />

        {/* Collapsible Developer Diagnostics Panel */}
        <div className="pt-1">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition py-1 focus:outline-none"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Developer Diagnostics</span>
            {showDiagnostics ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showDiagnostics && (
            <div className="mt-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs font-mono space-y-1 text-neutral-700">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>Camera: <strong className="text-neutral-900">{cameraStatus} ({cameraManager.getLabel()})</strong></div>
                <div>Microphone: <strong className="text-neutral-900">{micStatus}</strong></div>
                <div>Continuous Mic: <strong className="text-neutral-900">{isContinuous ? 'ACTIVE (Listening continuously)' : 'STOPPED'}</strong></div>
                <div>Voice State: <strong className="text-neutral-900">{voiceSessionState}</strong></div>
                <div>GPS Status: <strong className="text-neutral-900">{gpsStatus}</strong></div>
                <div>TTS State: <strong className="text-neutral-900">{isSpeaking ? 'Speaking' : 'Idle'}</strong></div>
                <div>Detection Model: <strong className="text-neutral-900">{isModelLoaded ? 'COCO-SSD Ready' : isModelLoading ? 'Loading...' : 'Error'}</strong></div>
                <div>Detection FPS: <strong className="text-neutral-900">{detectionFps} FPS</strong></div>
                <div>Live Detections: <strong className="text-neutral-900">{realTimeDetections.length} objects</strong></div>
                <div>Language: <strong className="text-neutral-900">{currentLanguage}</strong></div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 5. Voice Interaction Bar (Voice-First Experience with 🟢 Listening continuously / 🔴 Microphone stopped) */}
      <VoiceAssistantBar
        micStatus={micStatus}
        voiceState={voiceSessionState}
        isContinuousListening={isContinuous}
        currentTranscript={currentTranscript}
        lastSpokenText={lastSpokenText}
        isSpeaking={isSpeaking}
        onToggleMic={handleToggleMic}
        onQuickCommand={(cmd) => handleVoiceCommand(cmd)}
        onStopSpeech={() => audioManager.stop()}
        onRepeatSpeech={() => audioManager.repeatLastMessage()}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* 6. Offline Status Toast */}
      <OfflineIndicator />

      {/* 7. Setup Modal (First-Launch Walkthrough) */}
      <SetupModal
        isOpen={isSetupOpen}
        onComplete={handleSetupComplete}
        onRequestCamera={async () => cameraManager.start('environment')}
        onRequestMic={() => speechRecognitionManager.startContinuousListening(true)}
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

      {/* 12. Voice Help Modal */}
      <VoiceHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* 13. Object Detection Configuration Settings Modal */}
      <DetectionSettings
        settings={detectionSettings}
        onUpdateSettings={updateDetectionSettings}
        isOpen={isDetectionSettingsOpen}
        onClose={() => setIsDetectionSettingsOpen(false)}
      />
    </div>
  );
}
