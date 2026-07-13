
import React from 'react';
import { Button } from '@/components/ui/button';
import { Car, Truck, Bike, Search, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

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
          <div className="flex justify-center items-center gap-4 mb-8">
            <div className="p-3 rounded-full bg-primary/20 border border-primary/30">
              <Car className="h-8 w-8 text-primary" />
            </div>
            <div className="p-3 rounded-full bg-accent/20 border border-accent/30">
              <Bike className="h-8 w-8 text-accent" />
            </div>
            <div className="p-3 rounded-full bg-primary/20 border border-primary/30">
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
            Encontre Peças Automotivas com Facilidade e Rapidez!
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            A plataforma mais avançada do Brasil para conectar você aos melhores CDVs especializados. Encontre peças de carros, motos e caminhões com garantia de qualidade e preços imbatíveis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button onClick={onGetStarted} size="lg" className="gradient-bg hover:opacity-90 text-primary-foreground font-semibold px-8 py-4 text-lg">
              <Search className="h-5 w-5 mr-2" />
              Começar Agora - É Grátis
            </Button>
            <Button onClick={() => scrollToSection('como-funciona')} variant="outline" size="lg" className="border-primary text-primary hover:bg-primary/10 px-8 py-4 text-lg">
              Veja Como Funciona
              <ChevronDown className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 opacity-20 floating-animation">
        <Car className="h-16 w-16 text-primary" />
      </div>
      <div className="absolute bottom-20 right-10 opacity-20 floating-animation" style={{ animationDelay: '2s' }}>
        <Truck className="h-12 w-12 text-accent" />
      </div>
      <div className="absolute top-1/2 left-20 opacity-20 floating-animation" style={{ animationDelay: '4s' }}>
        <Bike className="h-10 w-10 text-primary" />
      </div>
    </section>
  );
};

export default HeroSection;
