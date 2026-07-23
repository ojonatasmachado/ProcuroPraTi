import { registerSW } from 'virtual:pwa-register';

export const isIosDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent);
  const isIpadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isAppleMobile || isIpadDesktopMode;
};

export const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

export const isStandalonePwa = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

const PWA_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export const refreshPwaApplication = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const previousController = navigator.serviceWorker.controller;
        await registration.update();
        const nextWorker = registration.waiting || registration.installing;
        if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        if (nextWorker && navigator.serviceWorker.controller === previousController) {
          await Promise.race([
            new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })),
            new Promise(resolve => window.setTimeout(resolve, 2500)),
          ]);
        }
      }
    } catch (error) {
      console.debug('PWA forced update failed', error?.message || error);
    }
  }
  const url = new URL(window.location.href);
  url.searchParams.set('atualizacao', Date.now().toString());
  window.location.replace(url.toString());
};

export const registerPwa = () => {
  let registration;
  let lastUpdateCheck = 0;
  let isReloading = false;

  const reportAppVisibility = () => {
    const message = {
      type: 'APP_VISIBILITY',
      visible: document.visibilityState === 'visible' && document.hasFocus(),
    };
    const targets = [navigator.serviceWorker.controller, registration?.active].filter(Boolean);
    [...new Set(targets)].forEach(worker => worker.postMessage(message));
  };

  const reloadWithNewVersion = () => {
    if (isReloading) return;
    isReloading = true;
    window.location.reload();
  };

  const checkForUpdate = async (force = false) => {
    if (!registration || !navigator.onLine) return;
    const now = Date.now();
    if (!force && now - lastUpdateCheck < PWA_UPDATE_INTERVAL_MS) return;
    lastUpdateCheck = now;
    try {
      await registration.update();
    } catch (error) {
      console.debug('PWA update check failed', error?.message || error);
    }
  };

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedReload: reloadWithNewVersion,
    onRegisteredSW(_swUrl, currentRegistration) {
      registration = currentRegistration;
      checkForUpdate(true);
      reportAppVisibility();

      window.addEventListener('pageshow', () => {
        checkForUpdate();
        reportAppVisibility();
      });
      window.addEventListener('pagehide', () => {
        const targets = [navigator.serviceWorker.controller, registration?.active].filter(Boolean);
        [...new Set(targets)].forEach(worker => worker.postMessage({ type: 'APP_VISIBILITY', visible: false }));
      });
      window.addEventListener('online', () => checkForUpdate(true));
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
        reportAppVisibility();
      });
      window.addEventListener('focus', reportAppVisibility);
      window.addEventListener('blur', reportAppVisibility);
      navigator.serviceWorker.addEventListener('controllerchange', reportAppVisibility);
      window.setInterval(reportAppVisibility, 5000);
    },
    onRegisterError(error) {
      console.debug('PWA registration failed', error?.message || error);
    },
  });

  return updateServiceWorker;
};
