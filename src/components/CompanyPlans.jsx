import React from 'react';
import { ArrowLeft, Check, Clock3, MapPinned, ShieldCheck, Sparkles, Users } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { SUBSCRIPTION_PLANS } from '@/lib/subscriptionPlans';

const formatPrice = value => Number(value).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});
const COMMON_FEATURES = ['Selo de empresa verificada', 'Fotos nas respostas', 'Página pública da empresa', 'Programa de indicação'];

const CompanyPlans = ({ currentPlanCode, subscriptionState, onClose }) => {
  const selectPlan = plan => {
    toast({
      title: `${plan.name} selecionado`,
      description: 'A contratação online estará disponível em breve. Nenhuma cobrança foi realizada.',
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="safe-header sticky top-0 z-40 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <BrandLogo compactOnMobile iconClassName="h-9 w-9" textClassName="text-lg sm:text-xl" />
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <ArrowLeft className="mr-2 h-4 w-4" />Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-3 py-8 sm:px-5">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-3 border-transparent bg-accent-agile text-accent-agile-foreground">Planos para empresas</Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Escolha até onde sua empresa quer vender</h1>
          <p className="mt-3 text-base leading-6 text-muted-foreground">
            O plano define o alcance, a prioridade de recebimento e a quantidade de acessos simultâneos da sua equipe.
          </p>
          {subscriptionState === 'trial_active' && (
            <p className="mt-3 rounded-xl border border-accent-agile/30 bg-accent-agile/10 px-4 py-3 text-sm font-semibold text-foreground">
              Seu período de experiência segue ativo. Você pode conhecer os planos sem interromper o trial.
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {SUBSCRIPTION_PLANS.map(plan => {
            const isCurrent = currentPlanCode === plan.code && subscriptionState === 'subscriber_active';
            return (
              <Card key={plan.code} className={`relative flex h-full flex-col overflow-hidden ${plan.featured ? 'border-2 border-primary shadow-xl shadow-primary/10' : 'border-border'} ${isCurrent ? 'ring-2 ring-accent-agile' : ''}`}>
                {plan.featured && <div className="bg-primary px-3 py-1.5 text-center text-xs font-extrabold uppercase tracking-wide text-primary-foreground">Melhor equilíbrio</div>}
                <CardHeader className="space-y-3 p-5 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl font-extrabold">{plan.name}</CardTitle>
                    {isCurrent && <Badge className="bg-accent-agile text-accent-agile-foreground">Atual</Badge>}
                  </div>
                  <p className="min-h-10 text-sm leading-5 text-muted-foreground">{plan.description}</p>
                  <div>
                    <span className="text-3xl font-extrabold">{formatPrice(plan.price)}</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col p-5 pt-2">
                  <div className="space-y-2.5 rounded-xl bg-secondary/60 p-3 text-sm">
                    <p className="flex items-start gap-2"><MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong>Alcance:</strong> {plan.reach}</span></p>
                    <p className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{plan.priority}</span></p>
                    <p className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{plan.accesses}</span></p>
                  </div>
                  <ul className="mt-4 flex-1 space-y-2.5">
                    {[...new Set([...COMMON_FEATURES, ...plan.features])].map(feature => <li key={feature} className="flex gap-2 text-sm leading-5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-agile" /><span>{feature}</span></li>)}
                  </ul>
                  <Button type="button" onClick={() => selectPlan(plan)} disabled={isCurrent} className={`mt-5 min-h-12 w-full font-bold ${plan.featured ? 'bg-primary text-primary-foreground' : ''}`}>
                    {isCurrent ? <><ShieldCheck className="mr-2 h-4 w-4" />Plano atual</> : <><Sparkles className="mr-2 h-4 w-4" />Escolher plano</>}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-muted-foreground">
          A contratação depende de confirmação explícita da empresa. O fim do período de experiência não gera cobrança automática.
        </p>
      </main>
    </div>
  );
};

export default CompanyPlans;
