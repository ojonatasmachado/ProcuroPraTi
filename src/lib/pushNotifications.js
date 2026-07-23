import dataService from '@/lib/dataService';
import { isIosDevice, isStandalonePwa } from '@/lib/pwa';

const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
export const PUSH_STATE_CHANGE_EVENT = 'procuroprati:push-state-change';

const emitPushState = (state) => {
  window.dispatchEvent(new CustomEvent(PUSH_STATE_CHANGE_EVENT, { detail: state }));
};

const urlBase64ToUint8Array = (value) => {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
};

export const getPushSupport = () => {
  if (!publicKey) return { supported: false, reason: 'configuration' };
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return { supported: false, reason: 'browser' };

  // On iOS, Web Push is deliberately exposed only to a Home Screen web app.
  // Checking this before the APIs gives the person a useful instruction instead
  // of the generic "unavailable" message Safari otherwise produces.
  if (isIosDevice() && !isStandalonePwa()) return { supported: false, reason: 'ios-installation' };
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return { supported: false, reason: 'browser' };
  if (!('PushManager' in window)) return { supported: false, reason: isIosDevice() ? 'ios-version' : 'browser' };

  return { supported: true, reason: null };
};

export const isPushSupported = () => getPushSupport().supported;

export const getPushState = async () => {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.ready;
  return (await registration.pushManager.getSubscription()) ? 'enabled' : 'disabled';
};

export const enablePush = async (userId, userType) => {
  if (!isPushSupported()) throw new Error('Este navegador não oferece suporte a notificações push.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('A permissão para notificações não foi concedida.');

  const registration = await navigator.serviceWorker.ready;
  const subscription = (await registration.pushManager.getSubscription()) || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await dataService.savePushSubscription(userId, userType, subscription.toJSON());
  emitPushState('enabled');
  return 'enabled';
};

export const syncExistingPushSubscription = async (userId, userType) => {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  await dataService.savePushSubscription(userId, userType, subscription.toJSON());
  return true;
};

export const disablePush = async () => {
  if (!isPushSupported()) return 'unsupported';
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await dataService.removePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
  emitPushState('disabled');
  return 'disabled';
};
