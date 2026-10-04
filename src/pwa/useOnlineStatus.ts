import { useEffect, useState } from 'react';
import { speechManager } from '../voice/SpeechManager';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      speechManager.speak('Internet connected. Online AI and navigation ready.', 4);
    };

    const handleOffline = () => {
      setIsOnline(false);
      speechManager.speak(
        'Internet connection unavailable. Online AI and navigation may not work.',
        2,
        true
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
