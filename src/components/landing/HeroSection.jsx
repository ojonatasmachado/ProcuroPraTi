
import React from 'react';
import { Button } from '@/components/ui/button';
import { Car, Truck, Bike, Bus, Search, Store } from 'lucide-react';
import { motion } from 'framer-motion';

const categories = [
  { icon: Car, label: 'Carro' },
  { icon: Bike, label: 'Moto' },
  { icon: Truck, label: 'Caminhão' },
  { icon: Bus, label: 'Ônibus' },
];

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
          <div className="text-xs sm:text-sm text-accent-agile uppercase tracking-widest mb-4 font-semibold">
            Peças automotivas · em breve, mais categorias
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-extrabold mb-6 text-foreground leading-tight max-w-4xl mx-auto">
            Diga o que você procura. As empresas certas respondem.
          </h1>
          <p className="text-lg sm:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Sem catálogos infinitos. Você publica o que precisa e só recebe respostas de quem realmente tem — com preço, condição e distância.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button onClick={() => onGetStarted('user')} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 text-lg">
              <Search className="h-5 w-5 mr-2" />
              Vou procurar uma peça
            </Button>
            <Button onClick={() => onGetStarted('company')} variant="outline" size="lg" className="border-accent-agile text-accent-agile hover:bg-accent-agile/10 px-8 py-4 text-lg">
              <Store className="h-5 w-5 mr-2" />
              Vou vender — cadastrar empresa
            </Button>
          </div>

          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Categorias em operação</div>
          <div className="flex gap-3 justify-center flex-wrap">
            {categories.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 bg-card border border-border rounded-xl px-5 py-3 min-w-[100px]">
                <Icon className="h-6 w-6 text-foreground" />
                <span className="text-xs font-semibold text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
