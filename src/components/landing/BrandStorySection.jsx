import React from 'react';
import { Store, Link2 } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';
import BrandMark from '@/components/BrandMark';

const BrandStorySection = () => (
  <section id="a-marca" className="py-16 sm:py-24 px-4">
    <div className="container mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="rounded-3xl border border-border bg-card overflow-hidden"
      >
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-7 sm:p-12 bg-gradient-to-br from-primary/15 via-card to-accent-agile/10 flex flex-col justify-center">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-agile mb-5">A marca que procura com você</span>
            <BrandLogo iconClassName="h-14 w-14 sm:h-16 sm:w-16" textClassName="text-3xl sm:text-5xl" className="items-center" />
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              O nome traduz nossa promessa: você conta o que precisa e a plataforma ajuda essa procura a chegar a quem pode atender.
            </p>
          </div>

          <div className="p-7 sm:p-12">
            <h2 className="text-3xl sm:text-5xl font-heading font-bold text-foreground mb-6">
              A Procuro Pra Ti aproxima quem precisa de quem tem para vender.
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8">
              Em vez de obrigar uma pessoa a navegar por catálogos, ligar para várias lojas ou repetir a mesma pergunta, a plataforma transforma uma necessidade em uma procura organizada. Empresas de peças automotivas visualizam oportunidades compatíveis e respondem quando podem atender.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: BrandMark, title: 'Você procura', text: 'Descreve a peça e o veículo.' },
                { icon: Link2, title: 'A plataforma conecta', text: 'Organiza a necessidade e as respostas.' },
                { icon: Store, title: 'A empresa vende', text: 'Responde a uma demanda real.' },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl bg-background border border-border p-5">
                  <Icon className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default BrandStorySection;
