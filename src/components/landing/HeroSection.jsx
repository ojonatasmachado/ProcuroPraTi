
import React from 'react';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';
import BrandMark from '@/components/BrandMark';

const HeroSection = ({ onGetStarted, scrollToSection }) => {
  return (
    <section className="py-16 sm:py-24 px-4 bg-gradient-to-br from-background via-card/30 to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="container mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <BrandLogo className="justify-center mb-6" iconClassName="h-10 w-10 sm:h-12 sm:w-12" textClassName="text-2xl sm:text-3xl" />
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-extrabold mb-6 text-foreground leading-tight max-w-4xl mx-auto">
            Quem procura encontra. Quem vende encontra clientes.
          </h1>
          <p className="text-lg sm:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Pessoas publicam o que precisam e empresas de peças automotivas respondem quando podem atender, com preço, condição e localização.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
            <Button onClick={() => onGetStarted('user')} size="lg" className="w-full min-h-12 h-auto whitespace-normal bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 sm:px-8 py-3 text-base sm:text-lg">
              <BrandMark className="h-5 w-5 mr-2" />
              Vou procurar
            </Button>
            <Button onClick={() => onGetStarted('company')} variant="outline" size="lg" className="w-full min-h-12 h-auto whitespace-normal border-accent-agile text-accent-agile hover:bg-accent-agile/10 px-5 sm:px-8 py-3 text-base sm:text-lg">
              <Store className="h-5 w-5 mr-2" />
              Vou vender
            </Button>
          </div>

        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
