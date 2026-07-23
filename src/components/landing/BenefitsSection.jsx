import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ListChecks, ShieldCheck, Target, MessageSquare, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const benefits = [
  { icon: Clock, audience: 'Para quem procura', title: 'Menos tempo procurando', description: 'Uma única procura pode alcançar diferentes empresas interessadas em atender.' },
  { icon: ListChecks, audience: 'Para quem procura', title: 'Respostas organizadas', description: 'Compare disponibilidade, preço e condições sem perder as informações importantes.' },
  { icon: ShieldCheck, audience: 'Para quem procura', title: 'Você decide o contato', description: 'O chat começa somente quando você escolher conversar com uma empresa.' },
  { icon: Target, audience: 'Para quem vende', title: 'Demanda mais qualificada', description: 'Veja necessidades publicadas por pessoas que já estão procurando uma peça.' },
  { icon: MessageSquare, audience: 'Para quem vende', title: 'Respostas mais objetivas', description: 'Apresente disponibilidade e condições diretamente em cada oportunidade.' },
  { icon: TrendingUp, audience: 'Para quem vende', title: 'Mais oportunidades', description: 'Use a plataforma como um novo canal para encontrar potenciais clientes.' },
];

const BenefitsSection = () => (
  <section id="beneficios" className="py-16 sm:py-24 px-4">
    <div className="container mx-auto">
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 sm:mb-16">
        <h2 className="text-3xl sm:text-5xl font-heading font-bold mb-5 text-foreground">A Procuro Pra Ti trabalha para os dois lados</h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">Facilita a procura para pessoas e transforma essas procuras em oportunidades para empresas.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {benefits.map(({ icon: Icon, audience, title, description }, index) => (
          <motion.div key={title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }}>
            <Card className="border-border hover:border-primary/50 transition-colors h-full bg-card">
              <CardHeader className="p-6 pb-3">
                <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4"><Icon className="h-6 w-6" /></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-agile">{audience}</span>
                <CardTitle className="text-xl text-foreground mt-1">{title}</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2"><p className="text-muted-foreground">{description}</p></CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default BenefitsSection;
