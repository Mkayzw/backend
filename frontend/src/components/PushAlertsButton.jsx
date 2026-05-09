import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { pushAPI } from '../api/push';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushAlertsButton() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const enable = async () => {
    if (!('serviceWorker' in navigator)) {
      error('This browser does not support Service Workers');
      return;
    }
    if (!('PushManager' in window)) {
      error('This browser does not support Push notifications');
      return;
    }
    if (!('Notification' in window)) {
      error('This browser does not support Notifications');
      return;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        error('Notification permission was not granted');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const { publicKey } = await pushAPI.getPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      const body = subscription.toJSON ? subscription.toJSON() : null;
      const payload = body && body.endpoint ? body : {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: body?.keys?.p256dh,
          auth: body?.keys?.auth,
        },
      };

      if (!payload?.endpoint || !payload?.keys?.p256dh || !payload?.keys?.auth) {
        throw new Error('Subscription missing required keys (p256dh/auth)');
      }

      await pushAPI.upsertSubscription(payload);
      success('Push alerts enabled on this browser');
    } catch (e) {
      error(`Failed to enable push alerts: ${e?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="btn btn-secondary"
      onClick={enable}
      disabled={loading}
      title="Enable browser push notifications for alerts"
      type="button"
      style={{ marginLeft: 'auto' }}
    >
      {loading ? 'Enabling…' : 'Enable Push Alerts'}
    </button>
  );
}
