import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessagesSquare, Store, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandMark from '@/components/BrandMark';

const journeys = [
  {
    icon: BrandMark,
    eyebrow: 'Para quem precisa de uma peça',
    title: 'Procure sem perder tempo',
    accent: 'primary',
    steps: [
      'Informe seu veículo e descreva a peça de que precisa.',
      'Defina por quanto tempo a procura ficará ativa.',
      'Receba respostas de empresas que podem atender.',
      'Compare as opções e inicie a conversa quando quiser.',
    ],
  },
  {
    icon: Store,
    eyebrow: 'Para empresas de peças automotivas',
    title: 'Venda para quem já está procurando',
    accent: 'agile',
    steps: [
      'Cadastre sua empresa e suas informações comerciais.',
      'Visualize procuras relacionadas ao que você vende.',
      'Responda com disponibilidade, preço e condições.',
      'Converse com o comprador depois que ele iniciar o chat.',
    ],
  },
];

const HowItWorksSection = () => (
  <section id="como-funciona" className="py-16 sm:py-24 px-4 bg-card/30">
    <div className="container mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12 sm:mb-16"
      >
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-agile">Dois lados, uma conexão</span>
        <h2 className="text-3xl sm:text-5xl font-heading font-bold mt-4 mb-5 text-foreground">Como a Procuro Pra Ti funciona</h2>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          A plataforma organiza a procura e aproxima compradores e empresas em um ambiente pensado para tornar o contato mais rápido e seguro.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
        {journeys.map(({ icon: Icon, eyebrow, title, accent, steps }) => (
          <motion.div key={title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="h-full border-border bg-card overflow-hidden">
              <CardHeader className="p-6 sm:p-8 pb-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-5 ${accent === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-accent-agile text-accent-agile-foreground'}`}>
                  <Icon className="h-6 w-6" />
                </div>
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

      <div className="mt-8 max-w-6xl mx-auto grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-background p-5 flex gap-4 items-start">
          <Target className="h-6 w-6 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">O comprador mantém o controle.</strong> Ele escolhe a duração da procura e decide quando iniciar uma conversa.</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5 flex gap-4 items-start">
          <MessagesSquare className="h-6 w-6 shrink-0 text-accent-agile" />
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">A empresa responde com contexto.</strong> Ela fala com pessoas que já demonstraram uma necessidade real.</p>
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
