
import React from 'react';
import { Button } from '@/components/ui/button';

const LandingHeader = ({ onGetStarted, scrollToSection }) => {
  return (
    <header className="py-4 px-4 shadow-md bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-heading font-extrabold tracking-tight lowercase">
            <span className="text-foreground">procuro</span>{' '}
            <span className="text-primary">pra ti</span>
          </h1>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollToSection('como-funciona')} className="text-muted-foreground hover:text-primary transition-colors">Como Funciona</button>
          <button onClick={() => scrollToSection('beneficios')} className="text-muted-foreground hover:text-primary transition-colors">Benefícios</button>
          <button onClick={() => scrollToSection('depoimentos')} className="text-muted-foreground hover:text-primary transition-colors">Depoimentos</button>
          <button onClick={() => scrollToSection('faq')} className="text-muted-foreground hover:text-primary transition-colors">FAQ</button>
          <Button onClick={() => onGetStarted('company')} variant="outline" className="border-border text-foreground hover:bg-card">
            Vou vender
          </Button>
          <Button onClick={() => onGetStarted('user')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Vou procurar
          </Button>
        </nav>
        <Button onClick={() => onGetStarted('user')} className="md:hidden bg-primary hover:bg-primary/90 text-primary-foreground">
          Vou procurar
        </Button>
      </div>
    </header>
  );
};

export default LandingHeader;
