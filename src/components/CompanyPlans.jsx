import React, { useState } from 'react';
import { Check, Clock3, CreditCard, MapPinned, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/use-toast';
import { SUBSCRIPTION_PLANS } from '@/lib/subscriptionPlans';

const formatPrice = value => Number(value).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});
const COMMON_FEATURES = ['Selo de empresa verificada', 'Fotos nas respostas', 'Selo de reputação', 'Página pública da empresa', 'Programa de indicação'];

const FEATURE_EXPLANATIONS = {
  reach: 'Distância de onde vêm as procuras que sua empresa recebe. Quanto maior o alcance, mais oportunidades chegam até você.',
  priority: 'Define quem vê a procura primeiro. Quanto maior a prioridade, mais cedo sua empresa recebe em relação aos demais planos.',
  accesses: 'Quantidade de pessoas da equipe que podem acessar e responder pela mesma conta ao mesmo tempo.',
  'Selo de empresa verificada': 'Mostra a quem procura que os dados da empresa foram confirmados na plataforma, gerando mais confiança.',
  'Fotos nas respostas': 'Permite anexar uma foto da peça na resposta, ajudando quem procura a decidir mais rápido.',
  'Selo de reputação': 'Exibe a nota e os comentários deixados por quem procura depois de fechar negócio com a empresa.',
  'Página pública da empresa': 'Uma página exclusiva da empresa na plataforma, visível mesmo para quem ainda não abriu uma procura ativa.',
  'Programa de indicação': 'Ao indicar outra empresa, você ganha desconto na mensalidade quando ela assinar.',
  'Tudo do Local': 'Inclui todos os recursos disponíveis no plano Local.',
  'Tudo do Regional': 'Inclui todos os recursos disponíveis nos planos Local e Regional.',
  'Tudo do Multirregional': 'Inclui todos os recursos disponíveis nos planos Local, Regional e Multirregional.',
  'Tudo do Estadual': 'Inclui todos os recursos disponíveis nos planos Local, Regional, Multirregional e Estadual.',
  'Resposta destacada nas comparações': 'Sua resposta aparece com um destaque visual na lista que a pessoa usa para comparar as opções.',
  'Relatório básico de desempenho': 'Resumo mensal das peças e dos veículos mais procurados na sua região.',
  'Respostas fixadas no topo': 'Sua resposta fica entre as primeiras, independentemente da ordem por proximidade ou preço.',
  'Relatório completo': 'Inclui sazonalidade, comparação com a média do estado e oportunidades que ficaram sem resposta.',
  'Oportunidades nacionais': 'Inclui procuras de peças raras ou de maior valor em todo o Brasil quando fizer sentido para a empresa.',
  'Selo para peças raras': 'Selo exclusivo que mostra a quem procura que sua empresa é referência em peças difíceis de encontrar.',
};

const HelpTip = ({ label, description }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className="ml-1 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-muted-foreground/60 text-[10px] font-extrabold leading-none text-muted-foreground transition-colors hover:border-accent-agile hover:text-accent-agile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Explicação sobre ${label}`}
        >
          ?
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={7}
        onOpenAutoFocus={event => event.preventDefault()}
        className="w-[min(17rem,calc(100vw-2rem))] border-accent-agile bg-popover p-3 text-xs leading-5 text-popover-foreground shadow-xl"
      >
        <strong className="mb-1 block text-foreground">{label}</strong>
        {description}
      </PopoverContent>
    </Popover>
  );
};

const PlanItem = ({ icon: Icon, label, children, explanation, positive = false }) => (
  <div className="flex items-start gap-2 text-sm leading-5">
    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${positive ? 'text-accent-agile' : 'text-primary'}`} />
    <span className="min-w-0">
      {children}
      <HelpTip label={label} description={explanation} />
    </span>
  </div>
);

const CompanyPlans = ({ currentPlanCode, subscriptionState }) => {
  const selectPlan = plan => {
    toast({
      title: `${plan.name} selecionado`,
      description: 'A contratação online estará disponível em breve. Nenhuma cobrança foi realizada.',
    });
  };

  return (
    <section className="mx-auto w-full max-w-7xl">
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
                    <PlanItem icon={MapPinned} label="Alcance" explanation={FEATURE_EXPLANATIONS.reach}><strong>Alcance:</strong> {plan.reach}</PlanItem>
                    <PlanItem icon={Clock3} label="Prioridade de resposta" explanation={FEATURE_EXPLANATIONS.priority}>{plan.priority}</PlanItem>
                    <PlanItem icon={Users} label="Acessos simultâneos" explanation={FEATURE_EXPLANATIONS.accesses}>{plan.accesses}</PlanItem>
                  </div>
                  <ul className="mt-4 flex-1 space-y-2.5">
                    {[...new Set([...COMMON_FEATURES, ...plan.features])].map(feature => (
                      <li key={feature}>
                        <PlanItem icon={Check} label={feature} explanation={FEATURE_EXPLANATIONS[feature] || 'Este recurso está incluído neste plano.'} positive>{feature}</PlanItem>
                      </li>
                    ))}
                  </ul>
                  <Button type="button" onClick={() => selectPlan(plan)} disabled={isCurrent} className={`mt-5 min-h-12 w-full font-bold ${plan.featured ? 'bg-primary text-primary-foreground' : ''}`}>
                    {isCurrent ? <><ShieldCheck className="mr-2 h-4 w-4" />Plano atual</> : <><CreditCard className="mr-2 h-4 w-4" />Escolher plano</>}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-muted-foreground">
          A contratação depende de confirmação explícita da empresa. O fim do período de experiência não gera cobrança automática.
        </p>
    </section>
  );
};

export default CompanyPlans;
