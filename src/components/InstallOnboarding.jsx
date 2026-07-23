import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BrandMark from '@/components/BrandMark';
import { Smartphone } from 'lucide-react';
import { isAndroidDevice, isIosDevice, isStandalonePwa } from '@/lib/pwa';
import { APP_INSTALLED_EVENT, hasInstallPrompt, INSTALL_PROMPT_AVAILABLE_EVENT } from '@/lib/installPrompt';
import { AddToHomeVisual, InstallConfirmationVisual, IosGuideStep, SafariShareVisual } from '@/components/FirstProcuraInfoModal';

const DISMISSED_UNTIL_KEY = 'procuroPraTi_installPromptDismissedUntil';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const canShowAgain = () => Number(window.localStorage.getItem(DISMISSED_UNTIL_KEY) || 0) <= Date.now();

const InstallOnboarding = ({ isAuthenticated = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isAndroid = isAndroidDevice();
  const isIos = isIosDevice();

  useEffect(() => {
    if (!isAuthenticated) {
      setIsOpen(false);
      return undefined;
    }
    if (isStandalonePwa() || (!isAndroid && !isIos)) return undefined;

    const showWhenReady = () => {
      if (!canShowAgain()) return;
      if (isIos || (isAndroid && hasInstallPrompt())) setIsOpen(true);
    };
    const timer = window.setTimeout(showWhenReady, 1200);
    window.addEventListener(INSTALL_PROMPT_AVAILABLE_EVENT, showWhenReady);
    window.addEventListener(APP_INSTALLED_EVENT, () => setIsOpen(false));
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(INSTALL_PROMPT_AVAILABLE_EVENT, showWhenReady);
    };
  }, [isAuthenticated, isAndroid, isIos]);

  const dismissForNow = () => {
    window.localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + ONE_DAY_MS));
    setIsOpen(false);
  };

  if (!isAuthenticated || isStandalonePwa() || (!isAndroid && !isIos)) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) dismissForNow(); }}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-md overflow-y-auto border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-7 text-xl font-heading">
            <BrandMark className="h-7 w-7 rounded-lg" />
            {isAndroid ? 'Instale a Procuro Pra Ti' : 'Instale no iPhone'}
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed">
            {isAndroid
              ? 'Adicione um atalho seguro à tela inicial pelo menu do Chrome e continue recebendo respostas.'
              : 'Faça isto no Safari: toque em Compartilhar, escolha “Adicionar à Tela de Início” e confirme em “Adicionar”.'}
          </DialogDescription>
        </DialogHeader>

        {isAndroid ? (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Smartphone className="h-6 w-6" /></span>
            <div>
              <p className="text-sm font-semibold">Adicione à tela inicial</p>
              <p className="mt-1 text-xs text-muted-foreground">No Chrome, toque em ⋮, depois em “Adicionar à tela inicial” e confirme. Isso cria um atalho seguro sem baixar aplicativo.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <IosGuideStep number="1" title="Toque em Compartilhar" description="Na barra inferior do Safari, toque no quadrado com a seta para cima, no centro da barra."><SafariShareVisual /></IosGuideStep>
            <IosGuideStep number="2" title="Role e escolha “Adicionar à Tela de Início”" description="No menu que abriu, deslize as opções para cima até encontrar essa opção e toque nela."><AddToHomeVisual /></IosGuideStep>
            <IosGuideStep number="3" title="Toque em “Adicionar”" description="Confirme no canto superior direito. Depois, abra pelo ícone que aparecerá na Tela de Início."><InstallConfirmationVisual /></IosGuideStep>
          </div>
        )}

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="outline" onClick={dismissForNow} className="w-full sm:w-auto">Agora não</Button>
          {isAndroid ? (
            <Button type="button" onClick={dismissForNow} className="w-full bg-primary text-primary-foreground sm:w-auto">
              Entendi, vou adicionar
            </Button>
          ) : (
            <Button type="button" onClick={() => setIsOpen(false)} className="w-full bg-primary text-primary-foreground sm:w-auto">Entendi, vou seguir os passos</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InstallOnboarding;
