
import React from 'react';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import LandingHeader from '@/components/landing/LandingHeader.jsx';
import HeroSection from '@/components/landing/HeroSection.jsx';
import HowItWorksSection from '@/components/landing/HowItWorksSection.jsx';
import BenefitsSection from '@/components/landing/BenefitsSection.jsx';
import TestimonialsSection from '@/components/landing/TestimonialsSection.jsx';
import FAQSection from '@/components/landing/FAQSection.jsx';
import LandingFooter from '@/components/landing/LandingFooter.jsx';

const LandingPage = ({ onGetStarted }) => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader onGetStarted={onGetStarted} scrollToSection={scrollToSection} />
      
      <HeroSection onGetStarted={onGetStarted} scrollToSection={scrollToSection} />

      {/* Prova rápida */}
      <section className="py-10 px-4">
        <div className="container mx-auto">
          <div className="bg-card border border-border rounded-2xl px-6 py-8 flex flex-wrap gap-8 justify-around text-center">
            <div>
              <div className="text-xl sm:text-2xl font-heading font-extrabold text-accent-agile">100% grátis</div>
              <div className="text-xs sm:text-sm text-muted-foreground">para quem procura</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-heading font-extrabold text-accent-agile">CDVs verificados</div>
              <div className="text-xs sm:text-sm text-muted-foreground">antes de aparecer nas procuras</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-heading font-extrabold text-accent-agile">Resposta em até 24h</div>
              <div className="text-xs sm:text-sm text-muted-foreground">prazo para empresas responderem</div>
            </div>
          </div>
        </div>
      </section>

      <HowItWorksSection />

      <BenefitsSection />

      <TestimonialsSection />

      {/* Como Começar */}
      <section className="py-16 sm:py-24 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl sm:text-5xl font-heading font-bold mb-6 text-foreground">
              Sua peça está a uma procura de distância
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Junte-se a milhares de brasileiros que já descobriram a forma mais inteligente de encontrar peças automotivas. Publique sua procura agora e experimente a diferença!
            </p>
            <Button onClick={() => onGetStarted('user')} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 text-lg">
              <ArrowRight className="h-5 w-5 mr-2" />
              Vou procurar agora
            </Button>
          </motion.div>
        </div>
      </section>

      <FAQSection />

      {/* CTA Final */}
      <section className="py-16 sm:py-24 px-4 bg-gradient-to-r from-primary/10 via-accent-agile/10 to-primary/10">
        <div className="container mx-auto text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl sm:text-5xl font-heading font-bold mb-6 text-foreground">
              Sua Peça Está a Um Clique de Distância
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Pare de perder tempo e dinheiro. Deixe que nossa tecnologia e rede de CDVs especializados trabalhem para você. É rápido, seguro e gratuito!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => onGetStarted('user')} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 text-lg">
                <Search className="h-5 w-5 mr-2" />
                Vou procurar uma peça
              </Button>
              <Button onClick={() => onGetStarted('company')} variant="outline" size="lg" className="border-accent-agile text-accent-agile hover:bg-accent-agile/10 px-8 py-4 text-lg">
                Vou vender — cadastrar empresa
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter scrollToSection={scrollToSection} />
    </div>
  );
};

export default LandingPage;
