import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, MessagesSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { PhoneMockup, BrowserMockup } from '@/components/landing/DeviceMockup';

const journeys = [
  {
    eyebrow: 'Para quem precisa de uma peça',
    title: 'Procure sem perder tempo',
    steps: [
      'Informe seu veículo e descreva a peça de que precisa.',
      'Defina por quanto tempo a procura ficará ativa.',
      'Receba respostas de empresas que podem atender.',
      'Compare as opções e inicie a conversa quando quiser.',
    ],
    mockup: (
      <div className="mb-6 flex items-center justify-center gap-3 sm:gap-4">
        <PhoneMockup
          src="/images/mockups/buyer-create-procura.gif"
          alt="Demonstração animada de criação de uma procura, com veículo, peça e prazo preenchidos"
          className="w-[46%]"
        />
        <PhoneMockup
          src="/images/mockups/buyer-compare-responses.gif"
          alt="Demonstração animada comparando respostas de diferentes empresas, com preço, condição, localização e fotos"
          className="w-[46%]"
        />
      </div>
    ),
  },
  {
    eyebrow: 'Para empresas de peças automotivas',
    title: 'Venda para quem já está procurando',
    steps: [
      'Cadastre sua empresa e suas informações comerciais.',
      'Visualize procuras relacionadas ao que você vende.',
      'Responda com disponibilidade, preço e condições.',
      'Converse com o comprador depois que ele iniciar o chat.',
    ],
    mockup: (
      <div className="mb-6 flex items-center justify-center gap-3 sm:gap-4">
        <BrowserMockup
          src="/images/mockups/company-procuras-list.gif"
          alt="Demonstração animada da lista de procuras compatíveis chegando para a empresa"
          className="w-[46%]"
        />
        <BrowserMockup
          src="/images/mockups/company-response-form.gif"
          alt="Demonstração animada da empresa respondendo, com condição, preço e mensagem"
          className="w-[46%]"
        />
      </div>
    ),
  },
];

const HowItWorksSection = () => (
  <section id="como-funciona" className="pt-16 sm:pt-24 pb-10 sm:pb-14 px-4 bg-card/30">
    <div className="container mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.4 }}
        className="text-center mb-12 sm:mb-16"
      >
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-agile-text">Dois lados, uma conexão</span>
        <h2 className="text-3xl sm:text-5xl font-heading font-bold mt-4 mb-5 text-foreground">Como a Procuro Pra Ti funciona</h2>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          A plataforma organiza a procura e aproxima compradores e empresas em um ambiente pensado para tornar o contato mais rápido e seguro.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
        {journeys.map(({ eyebrow, title, steps, mockup }) => (
          <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.4 }}>
            <Card className="h-full border-border bg-card overflow-hidden">
              <CardHeader className="p-6 sm:p-8 pb-4">
                {mockup}
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{eyebrow}</p>
                <CardTitle className="text-2xl sm:text-3xl text-foreground mt-2">{title}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 pt-3">
                <ol className="space-y-4">
                  {steps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-muted-foreground">
                      <span className="h-7 w-7 shrink-0 rounded-full bg-background border border-border flex items-center justify-center text-sm font-bold text-foreground">{index + 1}</span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 max-w-6xl mx-auto grid gap-4 sm:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-border bg-background p-5 flex gap-4 items-center">
          <Target className="h-6 w-6 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">O comprador mantém o controle.</strong> Ele escolhe a duração da procura e decide quando iniciar uma conversa.</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5 sm:p-6 flex flex-col-reverse sm:flex-row gap-5 items-center">
          <div className="flex-1">
            <MessagesSquare className="h-6 w-6 shrink-0 text-accent-agile-text mb-2" />
            <p className="text-sm text-muted-foreground"><strong className="text-foreground">A empresa responde com contexto.</strong> Comprador e empresa trocam fotos e gifs da peça pelo chat, tanto no celular quanto no computador, com notificação push a cada nova mensagem.</p>
          </div>
          <PhoneMockup
            src="/images/mockups/buyer-chat.gif"
            alt="Demonstração animada de uma conversa entre comprador e empresa pelo chat"
            size="sm"
            className="max-w-[150px] shrink-0"
          />
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
