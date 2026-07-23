
import React from 'react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import BrandLogo from '@/components/BrandLogo';

const LandingHeader = ({ onGetStarted, scrollToSection }) => {
  return (
    <header className="safe-header py-3 sm:py-4 px-3 sm:px-4 shadow-md bg-card/90 backdrop-blur-md sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <BrandLogo as="h1" iconClassName="h-9 w-9 sm:h-10 sm:w-10" textClassName="text-xl sm:text-2xl" />
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollToSection('como-funciona')} className="text-muted-foreground hover:text-primary transition-colors">Como Funciona</button>
          <button onClick={() => scrollToSection('a-marca')} className="text-muted-foreground hover:text-primary transition-colors">A Marca</button>
          <button onClick={() => scrollToSection('beneficios')} className="text-muted-foreground hover:text-primary transition-colors">Benefícios</button>
          <button onClick={() => scrollToSection('faq')} className="text-muted-foreground hover:text-primary transition-colors">FAQ</button>
          <Button onClick={() => onGetStarted('company')} variant="outline" className="border-border text-foreground hover:bg-card">
            Vou vender
          </Button>
          <Button onClick={() => onGetStarted('user')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Vou procurar
          </Button>
          <ThemeToggle />
        </nav>
        <div className="md:hidden">
          <ThemeToggle />
        </div>
        <div className="md:hidden grid grid-cols-2 gap-2 w-full">
          <Button onClick={() => onGetStarted('user')} className="w-full h-auto min-h-11 whitespace-normal bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 text-sm">
            Vou procurar
          </Button>
          <Button onClick={() => onGetStarted('company')} variant="outline" className="w-full h-auto min-h-11 whitespace-normal border-accent-agile text-accent-agile hover:bg-accent-agile/10 px-3 py-2 text-sm">
            Vou vender
          </Button>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
