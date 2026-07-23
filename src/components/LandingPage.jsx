
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import LandingHeader from '@/components/landing/LandingHeader.jsx';
import HeroSection from '@/components/landing/HeroSection.jsx';
import BrandStorySection from '@/components/landing/BrandStorySection.jsx';
import HowItWorksSection from '@/components/landing/HowItWorksSection.jsx';
import BenefitsSection from '@/components/landing/BenefitsSection.jsx';
import FAQSection from '@/components/landing/FAQSection.jsx';
import LandingFooter from '@/components/landing/LandingFooter.jsx';
import BrandMark from '@/components/BrandMark';

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

      <section className="py-10 px-4">
        <div className="container mx-auto">
          <div className="bg-card border border-border rounded-2xl px-5 sm:px-8 py-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-heading font-extrabold text-accent-agile">Para quem procura</div>
              <div className="text-sm text-muted-foreground mt-1">publique sua necessidade com clareza</div>
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-heading font-extrabold text-accent-agile">Para quem vende</div>
              <div className="text-sm text-muted-foreground mt-1">encontre oportunidades reais de negócio</div>
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-heading font-extrabold text-accent-agile">Rápido e seguro</div>
              <div className="text-sm text-muted-foreground mt-1">conexões diretas dentro da plataforma</div>
            </div>
          </div>
        </div>
      </section>

      <BrandStorySection />

      <HowItWorksSection />

      <BenefitsSection />

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
              Informe o veículo e a peça de que precisa. A plataforma organiza sua procura para que empresas interessadas possam responder.
            </p>
            <Button onClick={() => onGetStarted('user')} size="lg" className="w-full sm:w-auto min-h-12 h-auto whitespace-normal bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 sm:px-8 py-3 text-base sm:text-lg">
              <ArrowRight className="h-5 w-5 mr-2" />
              Vou procurar
            </Button>
          </motion.div>
        </div>
      </section>

      <FAQSection />

      <section className="py-16 sm:py-24 px-4 bg-gradient-to-r from-primary/10 via-accent-agile/10 to-primary/10">
        <div className="container mx-auto text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl sm:text-5xl font-heading font-bold mb-6 text-foreground">
              Um lugar para procurar. Um lugar para vender.
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              A plataforma aproxima necessidades reais de empresas que podem atendê-las, com uma experiência simples, rápida e segura.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <Button onClick={() => onGetStarted('user')} size="lg" className="w-full min-h-12 h-auto whitespace-normal bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 sm:px-8 py-3 text-base sm:text-lg">
                <BrandMark className="h-5 w-5 mr-2" />
                Vou procurar
              </Button>
              <Button onClick={() => onGetStarted('company')} variant="outline" size="lg" className="w-full min-h-12 h-auto whitespace-normal border-accent-agile text-accent-agile hover:bg-accent-agile/10 px-5 sm:px-8 py-3 text-base sm:text-lg">
                Vou vender
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
