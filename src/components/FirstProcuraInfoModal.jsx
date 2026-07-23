import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BrandMark from '@/components/BrandMark';
import { BellRing, Check, ChevronLeft, MessageCircle, PlusSquare, Share, ShieldCheck, Smartphone } from 'lucide-react';
import { enablePush, getPushState, getPushSupport } from '@/lib/pushNotifications';
import { isAndroidDevice, isIosDevice, isStandalonePwa } from '@/lib/pwa';

export const SafariShareVisual = () => (
  <Card className="overflow-hidden border-border bg-background shadow-sm" aria-hidden="true">
    <CardContent className="p-0">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-destructive/70" />
        <div className="flex-1 rounded-md bg-input px-2 py-1 text-center text-[9px] text-muted-foreground">procuroprati.com</div>
      </div>
      <div className="flex min-h-24 flex-col items-center justify-center gap-2 bg-background p-4">
        <BrandMark className="h-8 w-8 rounded-lg" />
        <span className="text-[10px] font-semibold text-foreground">Sua procura está ativa</span>
      </div>
      <div className="flex items-center justify-around border-t border-border bg-card px-4 py-2 text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
        <span className="rounded-lg bg-primary/15 p-1.5 ring-2 ring-primary/40"><Share className="h-4 w-4 text-primary" /></span>
        <span className="text-lg leading-none">•••</span>
      </div>
    </CardContent>
  </Card>
);

export const AddToHomeVisual = () => (
  <Card className="border-border bg-background shadow-sm" aria-hidden="true">
    <CardContent className="space-y-2 p-3">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
      <div className="flex items-center gap-3 rounded-lg bg-input p-2 text-[10px] text-muted-foreground">
        <Share className="h-4 w-4" /> Compartilhar
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-2 text-[10px] font-semibold text-foreground ring-1 ring-primary/20">
        <PlusSquare className="h-4 w-4 text-primary" /> Adicionar à Tela de Início
      </div>
    </CardContent>
  </Card>
);

export const InstallConfirmationVisual = () => (
  <Card className="border-border bg-background shadow-sm" aria-hidden="true">
    <CardContent className="p-3">
      <div className="flex items-center justify-between border-b border-border pb-2 text-[10px]">
        <span className="text-primary">Cancelar</span>
        <span className="font-semibold text-foreground">Adicionar à Tela de Início</span>
        <span className="rounded-md bg-primary px-2 py-1 font-semibold text-primary-foreground">Adicionar</span>
      </div>
      <div className="flex items-center gap-3 py-4">
        <BrandMark className="h-11 w-11 rounded-xl" />
        <div>
          <p className="text-xs font-semibold text-foreground">Procuro Pra Ti</p>
          <p className="text-[9px] text-muted-foreground">procuroprati.com</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const IosGuideStep = ({ number, title, description, children }) => (
  <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{number}</div>
    <div className="min-w-0 space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  </div>
);

const FirstProcuraInfoModal = ({ isOpen, currentUser, userType, hasActiveSearch = false, onComplete, onLater, onKeepPending }) => {
  const [view, setView] = useState('prompt');
  const [pushState, setPushState] = useState('loading');
  const [pushSupportReason, setPushSupportReason] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [installationAccepted, setInstallationAccepted] = useState(false);
  const iosNeedsInstallation = isIosDevice() && !isStandalonePwa();
  const androidNeedsInstallation = isAndroidDevice() && !isStandalonePwa() && !installationAccepted;

  useEffect(() => {
    if (!isOpen) return undefined;
    setView('prompt');
    setInstallationAccepted(false);
    setErrorMessage('');
    setPushSupportReason(getPushSupport().reason);
    let active = true;
    getPushState()
      .then((state) => { if (active) setPushState(state); })
      .catch(() => { if (active) setPushState('unsupported'); });
    return () => { active = false; };
  }, [isOpen]);

  const handleEnablePush = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await enablePush(currentUser.id, userType);
      setPushState('enabled');
    } catch (error) {
      const nextState = await getPushState().catch(() => 'unsupported');
      setPushState(nextState);
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogChange = (open) => {
    if (!open) onLater();
  };

  if (view === 'ios-guide') {
    return (
      <Dialog open={isOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-h-[calc(100dvh-1.5rem)] max-w-lg overflow-y-auto border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-7 text-xl font-heading text-foreground">
              <BrandMark className="h-7 w-7 rounded-lg" />
              Instale no iPhone
            </DialogTitle>
            <DialogDescription className="text-left leading-relaxed text-muted-foreground">
              Faça isso no Safari, não dentro do WhatsApp ou de outro navegador. São três toques para colocar a Procuro Pra Ti na Tela de Início.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <IosGuideStep number="1" title="Toque em Compartilhar" description="Na barra inferior do Safari, toque no ícone de um quadrado com a seta apontando para cima. Ele fica no centro da barra, como destacado abaixo.">
              <SafariShareVisual />
            </IosGuideStep>
            <IosGuideStep number="2" title="Role o menu e toque em “Adicionar à Tela de Início”" description="Depois de abrir Compartilhar, deslize a lista de opções para cima até encontrar “Adicionar à Tela de Início”. Toque nessa opção.">
              <AddToHomeVisual />
            </IosGuideStep>
            <IosGuideStep number="3" title="Confirme em “Adicionar”" description="Na tela seguinte, toque em “Adicionar” no canto superior direito. O ícone da Procuro Pra Ti aparecerá na Tela de Início do iPhone.">
              <InstallConfirmationVisual />
            </IosGuideStep>
            <div className="rounded-xl border border-accent-agile/30 bg-accent-agile/10 p-3 text-xs leading-relaxed text-foreground">
              <strong>Último passo:</strong> saia do Safari e abra a Procuro Pra Ti pelo novo ícone na Tela de Início. Aí você poderá liberar as notificações.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button type="button" variant="outline" onClick={() => setView('prompt')} className="w-full sm:w-auto">Voltar</Button>
            <Button type="button" onClick={onKeepPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">Entendi, vou seguir os passos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const notificationsEnabled = pushState === 'enabled';
  const notificationsDenied = pushState === 'denied';
  const notificationsUnsupported = pushState === 'unsupported';

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] max-w-md overflow-y-auto border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-7 text-xl font-heading text-foreground">
            <BrandMark className="h-7 w-7 rounded-lg" />
            {hasActiveSearch ? 'Sua procura está ativa' : 'Ative as notificações'}
          </DialogTitle>
          <DialogDescription className="text-left leading-relaxed text-muted-foreground">
            {hasActiveSearch
              ? 'Ative as notificações para saber quando sua peça for encontrada.'
              : userType === 'company'
                ? 'Receba novas procuras e mensagens mesmo quando o aplicativo estiver fechado.'
                : 'Receba respostas e mensagens mesmo quando o aplicativo estiver fechado.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-xl border border-border bg-background p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15"><BellRing className="h-5 w-5 text-primary" /></span>
            <div><p className="text-sm font-semibold text-foreground">Respostas em tempo real</p><p className="text-xs leading-relaxed text-muted-foreground">Receba um aviso quando uma empresa informar que possui a peça.</p></div>
          </div>
          <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-xl border border-border bg-background p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-agile/15"><MessageCircle className="h-5 w-5 text-accent-agile" /></span>
            <div><p className="text-sm font-semibold text-foreground">Novas mensagens</p><p className="text-xs leading-relaxed text-muted-foreground">Acompanhe o chat mesmo quando a plataforma não estiver aberta.</p></div>
          </div>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Você controla essa permissão e pode desativá-la a qualquer momento pelo seu perfil.</p>

          {iosNeedsInstallation && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Smartphone className="h-4 w-4 text-primary" />No iPhone, instale primeiro</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">No Safari, toque em Compartilhar, depois em “Adicionar à Tela de Início” e confirme em “Adicionar”. Só então o iPhone libera as notificações.</p>
            </div>
          )}

          {androidNeedsInstallation && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Smartphone className="h-4 w-4 text-primary" />Instale primeiro</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">No Chrome, toque em ⋮ e escolha “Adicionar à tela inicial”. Isso cria um atalho seguro, sem baixar aplicativo. Depois, abra pelo novo ícone e ative as notificações.</p>
            </div>
          )}

          {notificationsDenied && <p className="rounded-lg border border-danger/30 bg-destructive/20 p-3 text-xs text-danger">As notificações estão bloqueadas neste navegador. Libere a permissão nos ajustes do aparelho e tente novamente.</p>}
          {notificationsUnsupported && !iosNeedsInstallation && pushSupportReason === 'ios-version' && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs leading-relaxed text-foreground">
              <p className="font-semibold">Atualize o iPhone para ativar as notificações</p>
              <p className="mt-1 text-muted-foreground">A Procuro Pra Ti já está instalada corretamente. A Apple libera notificações em apps da Tela de Início somente no iOS 16.4 ou mais recente. Vá em Ajustes › Geral › Atualização de Software e, depois de atualizar, abra o app pelo ícone e ative as notificações aqui.</p>
            </div>
          )}
          {notificationsUnsupported && !iosNeedsInstallation && pushSupportReason !== 'ios-version' && <p className="rounded-lg border border-border bg-input p-3 text-xs text-muted-foreground">Este navegador não oferece notificações push. Tente usar uma versão atualizada do Safari, Chrome ou Edge.</p>}
          {errorMessage && !notificationsDenied && <p className="rounded-lg border border-danger/30 bg-destructive/20 p-3 text-xs text-danger">{errorMessage}</p>}
          {notificationsEnabled && <p className="flex items-center gap-2 rounded-lg border border-accent-agile/30 bg-accent-agile/10 p-3 text-sm font-semibold text-foreground"><Check className="h-4 w-4 text-accent-agile" />Notificações ativadas neste aparelho.</p>}
        </div>

        <DialogFooter className="gap-2 sm:space-x-0">
          {notificationsEnabled ? (
            <Button type="button" onClick={onComplete} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Continuar</Button>
          ) : androidNeedsInstallation ? (
            <>
              <Button type="button" variant="outline" onClick={onLater} className="w-full sm:w-auto">Agora não</Button>
              <Button type="button" onClick={() => { setInstallationAccepted(true); onKeepPending(); }} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">Entendi, vou adicionar</Button>
            </>
          ) : iosNeedsInstallation ? (
            <>
              <Button type="button" variant="outline" onClick={onLater} className="w-full sm:w-auto">Agora não</Button>
              <Button type="button" onClick={() => setView('ios-guide')} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">Ver passo a passo</Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onLater} className="w-full sm:w-auto">Agora não</Button>
              <Button type="button" onClick={handleEnablePush} disabled={isSubmitting || pushState === 'loading' || notificationsDenied || notificationsUnsupported} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
                <BellRing className="mr-2 h-4 w-4" />{isSubmitting ? 'Ativando...' : 'Ativar notificações'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FirstProcuraInfoModal;
