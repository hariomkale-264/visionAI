class NotificationManager {
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  public notify(title: string, options?: NotificationOptions) {
    if (!this.isSupported() || Notification.permission !== 'granted') return;
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/icon.svg',
            ...options,
          });
        });
      } else {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          ...options,
        });
      }
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  }
}

export const notificationManager = new NotificationManager();
