import React from 'react';
import { motion } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';

const BrandStorySection = () => (
  <section id="a-marca" className="py-16 sm:py-24 px-4">
    <div className="container mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl border border-border bg-card overflow-hidden"
      >
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-7 sm:p-12 bg-gradient-to-br from-primary/15 via-card to-accent-agile/10 flex flex-col justify-center">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-agile-text mb-5">A marca que procura com você</span>
            <BrandLogo iconClassName="h-14 w-14 sm:h-16 sm:w-16" textClassName="text-3xl sm:text-5xl" className="items-center" />
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              O nome traduz nossa promessa: você conta o que precisa e a plataforma ajuda essa procura a chegar a quem pode atender.
            </p>
          </div>

          <div className="p-7 sm:p-12 flex flex-col justify-center">
            <h2 className="text-3xl sm:text-5xl font-heading font-bold text-foreground mb-6">
              Uma plataforma pensada para acabar com a procura repetitiva por peças.
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Em vez de obrigar uma pessoa a navegar por catálogos, ligar para várias lojas ou repetir a mesma pergunta, a plataforma transforma uma necessidade em uma procura organizada. Empresas de peças automotivas visualizam oportunidades compatíveis e respondem quando podem atender.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default BrandStorySection;
