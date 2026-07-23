export const INSTALL_PROMPT_AVAILABLE_EVENT = 'procuroprati:install-prompt-available';
export const APP_INSTALLED_EVENT = 'procuroprati:app-installed';

let deferredInstallPrompt = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    window.dispatchEvent(new Event(INSTALL_PROMPT_AVAILABLE_EVENT));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new Event(APP_INSTALLED_EVENT));
  });
}

export const hasInstallPrompt = () => Boolean(deferredInstallPrompt);

export const requestPwaInstallation = async () => {
  if (!deferredInstallPrompt) return { outcome: 'unavailable' };
  try {
    const prompt = deferredInstallPrompt;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') deferredInstallPrompt = null;
    return choice;
  } catch {
    return { outcome: 'unavailable' };
  }
};
