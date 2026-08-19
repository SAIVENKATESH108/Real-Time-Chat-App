/**
 * Native Browser Web Notifications Helper with Permission Management
 */

export const notifications = {
  isSupported: () => 'Notification' in window,

  getPermission: () => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  requestPermission: async () => {
    if (!('Notification' in window)) return 'unsupported';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      return 'denied';
    }
  },

  show: ({ title, body, icon, onClick }) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return null;

    // Check if document is currently focused; if focused, skip OS popup (in-app toast handles it)
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      return null;
    }

    try {
      const notif = new Notification(title || 'chatO Message', {
        body: body || 'New message received',
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'chato-message',
      });

      if (onClick) {
        notif.onclick = () => {
          window.focus();
          onClick();
          notif.close();
        };
      }

      setTimeout(() => notif.close(), 5000);
      return notif;
    } catch (e) {
      console.warn('Could not display notification:', e);
      return null;
    }
  },
};
