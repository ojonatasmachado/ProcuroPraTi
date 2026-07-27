import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCENT = {
  primary: { soft: 'bg-primary/15', text: 'text-primary', dot: 'bg-primary' },
  agile: { soft: 'bg-accent-agile/15', text: 'text-accent-agile-text', dot: 'bg-accent-agile' },
  warning: { soft: 'bg-warning/15', text: 'text-warning', dot: 'bg-warning' },
};

const STEPS = {
  user: [
    { icon: '👋', accent: 'primary', title: 'Bem-vindo ao procuro pra ti', desc: 'Diga o que você precisa. As empresas certas respondem, sem catálogo pra você procurar sozinho.' },
    { icon: '📦', accent: 'primary', title: 'Crie sua procura em 1 minuto', desc: 'Veículo, peça, condição e local. Quanto mais detalhe, respostas mais certeiras.' },
    { icon: '💬', accent: 'agile', title: 'Compare as respostas', desc: 'Veja preço, condição e distância de cada empresa lado a lado, e converse direto no chat.' },
    { icon: '✅', accent: 'agile', title: 'Feche com quem for melhor pra você', desc: 'Escolha, combine e finalize sua procura. Simples assim.' },
  ],
  company: [
    { icon: '🏪', accent: 'agile', title: 'Bem-vindo, parceiro', desc: 'Veja procuras de clientes perto de você, só responde quem realmente tem a peça.' },
    { icon: '⚡', accent: 'warning', title: 'Responda rápido', desc: 'Cada procura tem prazo visível. Quem responde primeiro sai na frente na decisão do cliente.' },
    { icon: '👍', accent: 'primary', title: 'Tenho ou não tenho', desc: 'Ação simples e direta: informe preço e condição, sem formulários longos.' },
    { icon: '⭐', accent: 'agile', title: 'Construa sua reputação', desc: 'Boas respostas viram avaliações. Mais reputação, mais confiança, mais negócios.' },
  ],
};

const OnboardingTourModal = ({ isOpen, userType, onClose }) => {
  const [step, setStep] = useState(0);
  const persona = userType === 'company' ? 'company' : 'user';
  const steps = STEPS[persona];

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  const current = steps[Math.min(step, steps.length - 1)];
  const accent = ACCENT[current.accent];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) { onClose(); return; }
    setStep(s => s + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showClose={false} className="max-w-[440px] gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{current.title}</DialogTitle>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Pular ✕
        </button>

        <div className="px-8 pb-6 pt-11 text-center">
          <div className={cn('mx-auto mb-5 flex h-[76px] w-[76px] items-center justify-center rounded-[20px] text-3xl', accent.soft)} aria-hidden="true">
            {current.icon}
          </div>
          <p className={cn('mb-2.5 text-[11px] font-bold uppercase tracking-wider', accent.text)}>
            {persona === 'user' ? 'Usuário' : 'Empresa'} · passo {step + 1}/{steps.length}
          </p>
          <h2 className="mb-2.5 font-heading text-[22px] font-extrabold leading-tight text-foreground">{current.title}</h2>
          <p className="mx-auto max-w-[340px] text-sm leading-relaxed text-muted-foreground">{current.desc}</p>
        </div>

        <div className="flex justify-center gap-1.5 pb-6" role="presentation">
          {steps.map((_, index) => (
            <span
              key={index}
              className={cn('h-1.5 rounded-full transition-all', index === step ? cn('w-[22px]', accent.dot) : 'w-1.5 bg-border')}
            />
          ))}
        </div>

        <div className="flex gap-2.5 border-t border-border p-4">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} className="border-muted-foreground/40 text-muted-foreground hover:text-foreground">
              Voltar
            </Button>
          )}
          <Button type="button" onClick={handleNext} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
            {isLast ? 'Começar' : 'Próximo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTourModal;
