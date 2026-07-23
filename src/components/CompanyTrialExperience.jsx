import React from 'react';
import { BarChart3, CalendarDays, CheckCircle2, Clock3, MapPinned, ShieldCheck, Sparkles, Target, X } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const clamp = value => Math.max(0, Math.min(100, value));

const ProgressBar = ({ value, tone = 'primary' }) => (
  <div className="h-2.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
    <div className={`h-full rounded-full transition-all ${tone === 'accent' ? 'bg-accent-agile' : 'bg-primary'}`} style={{ width: `${clamp(value)}%` }} />
  </div>
);

export const TrialProgressCard = ({ context, onShowPlans }) => {
  if (!context || context.state !== 'trial_active') return null;
  const days = Number(context.daysElapsed || 0);
  const responses = Number(context.responded || 0);
  const dayProgress = clamp((days / Number(context.daysTarget || 30)) * 100);
  const responseProgress = clamp((responses / Number(context.responsesTarget || 30)) * 100);
  const isFinalStretch = (days >= 25 && responses >= 25) || days >= 80;
  const isExtended = context.trialExtendedUntil && new Date(context.trialExtendedUntil) > new Date(context.trialHardEndsAt || 0);

  return (
    <Card className={`overflow-hidden border ${isFinalStretch ? 'border-warning/50 bg-warning/5' : 'border-primary/25 bg-card'} shadow-sm`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-extrabold text-foreground">Período de experiência</p>
              <Badge className="border-transparent bg-accent-agile text-accent-agile-foreground">Alcance estadual</Badge>
              {isExtended && <Badge variant="outline" className="border-primary text-primary">Prorrogado</Badge>}
            </div>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Você responde normalmente enquanto acompanha os dois critérios.
            </p>
          </div>
          <Target className={`h-6 w-6 shrink-0 ${isFinalStretch ? 'text-warning' : 'text-primary'}`} />
        </div>

        {isFinalStretch && (
          <div className="mt-3 rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-sm font-semibold text-foreground">
            Reta final do seu período de experiência. Conheça os planos para continuar respondendo sem interrupção.
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary" />Tempo</span>
              <strong>{days} de 30 dias</strong>
            </div>
            <ProgressBar value={dayProgress} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4 text-accent-agile" />Procuras respondidas</span>
              <strong>{responses} de 30</strong>
            </div>
            <ProgressBar value={responseProgress} tone="accent" />
          </div>
        </div>
        <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-border pt-3 sm:flex-row sm:items-center">
          <p className="text-xs leading-5 text-muted-foreground">O trial encerra quando os dois critérios forem concluídos, limitado a 90 dias, salvo prorrogação do administrador.</p>
          <Button type="button" variant="outline" size="sm" onClick={onShowPlans} className="w-full shrink-0 border-primary text-primary sm:w-auto">Ver planos</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const TrialWelcomeModal = ({ open, onContinue, onShowPlans }) => (
  <Dialog open={open}>
    <DialogContent className="max-w-lg border-border bg-card text-foreground [&>button]:hidden">
      <DialogHeader className="text-center sm:text-center">
        <BrandMark className="mx-auto h-14 w-14 rounded-2xl" />
        <Badge className="mx-auto mt-2 w-fit bg-accent-agile text-accent-agile-foreground">Seu trial começou</Badge>
        <DialogTitle className="pt-2 text-2xl font-extrabold">Venda com alcance estadual</DialogTitle>
      </DialogHeader>
      <p className="text-center text-sm leading-6 text-muted-foreground">Sua empresa já pode receber e responder procuras de todo o estado, sem cobrança automática.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/60 p-4"><CalendarDays className="mb-2 h-5 w-5 text-primary" /><strong className="block">Mínimo de 30 dias</strong><span className="text-xs text-muted-foreground">Tempo para conhecer a plataforma.</span></div>
        <div className="rounded-xl border border-border bg-secondary/60 p-4"><Target className="mb-2 h-5 w-5 text-accent-agile" /><strong className="block">Mínimo de 30 respostas</strong><span className="text-xs text-muted-foreground">Tenho e Não tenho contam.</span></div>
      </div>
      <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-5 text-foreground">O que demorar mais define o encerramento. O limite é de 90 dias, salvo prorrogação do administrador.</p>
      <DialogFooter className="gap-2 sm:grid sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onShowPlans}>Conhecer planos</Button>
        <Button type="button" onClick={onContinue}>Começar a responder</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const TrialEndModal = ({ open, context, onClose, onShowPlans }) => (
  <Dialog open={open}>
    <DialogContent className="max-w-lg border-border bg-card text-foreground [&>button]:hidden">
      <DialogHeader>
        <div className="flex items-center gap-3"><div className="rounded-xl bg-warning/15 p-2.5"><Clock3 className="h-6 w-6 text-warning" /></div><DialogTitle className="text-xl font-extrabold">Seu período de experiência encerrou</DialogTitle></div>
      </DialogHeader>
      <p className="text-sm leading-6 text-muted-foreground">As procuras continuam visíveis. Para responder novamente, escolha um plano.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-secondary p-3 text-center"><strong className="block text-xl">{context?.received || 0}</strong><span className="text-xs text-muted-foreground">Recebidas</span></div>
        <div className="rounded-xl bg-secondary p-3 text-center"><strong className="block text-xl">{context?.responded || 0}</strong><span className="text-xs text-muted-foreground">Respondidas</span></div>
        <div className="rounded-xl bg-accent-agile/10 p-3 text-center"><strong className="block text-xl text-accent-agile">{context?.positive || 0}</strong><span className="text-xs text-muted-foreground">Tenho</span></div>
        <div className="rounded-xl bg-secondary p-3 text-center"><strong className="block text-xl">{context?.negative || 0}</strong><span className="text-xs text-muted-foreground">Não tenho</span></div>
      </div>
      <div className="rounded-xl border border-border p-4">
        <p className="mb-3 text-sm font-extrabold">Procuras que cada alcance teria incluído</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {[['Local', 'local'], ['Regional', 'regional'], ['Multirregional', 'multiregional'], ['Estadual', 'estadual'], ['Nacional', 'nacional']].map(([label, code]) => (
            <p key={code} className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{label}</span><strong>{context?.planCoverage?.[code] || 0}</strong></p>
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
        <p className="flex items-center gap-2"><MapPinned className="h-4 w-4 text-primary" />Escolha o alcance ideal para sua empresa.</p>
        <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-agile" />Nenhuma cobrança acontece sem sua confirmação.</p>
      </div>
      <DialogFooter className="gap-2 sm:grid sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onClose}>Ver procuras</Button>
        <Button type="button" onClick={onShowPlans}><Sparkles className="mr-2 h-4 w-4" />Escolher meu plano</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const SubscriptionBlockedDialog = ({ open, onClose, onShowPlans }) => (
  <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="max-w-md border-border bg-card text-foreground">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-xl font-extrabold"><span className="rounded-xl bg-primary/10 p-2"><ShieldCheck className="h-6 w-6 text-primary" /></span>Assine um plano para responder</DialogTitle>
      </DialogHeader>
      <p className="text-sm leading-6 text-muted-foreground">Você pode continuar acompanhando as procuras. Escolha um plano para liberar os botões Tenho e Não tenho.</p>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Agora não</Button>
        <Button type="button" onClick={onShowPlans}>Ver planos</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
