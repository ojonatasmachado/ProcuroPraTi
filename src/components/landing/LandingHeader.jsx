
import React from 'react';
import { Button } from '@/components/ui/button';

// Logo Component
const AutoPartsLogo = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 10L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

const LandingHeader = ({ onGetStarted, scrollToSection }) => {
  return (
    <header className="py-4 px-4 shadow-md bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full gradient-bg">
            <AutoPartsLogo className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Procuro Pra Ti
          </h1>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollToSection('como-funciona')} className="text-muted-foreground hover:text-primary transition-colors">Como Funciona</button>
          <button onClick={() => scrollToSection('beneficios')} className="text-muted-foreground hover:text-primary transition-colors">Benefícios</button>
          <button onClick={() => scrollToSection('depoimentos')} className="text-muted-foreground hover:text-primary transition-colors">Depoimentos</button>
          <button onClick={() => scrollToSection('faq')} className="text-muted-foreground hover:text-primary transition-colors">FAQ</button>
          <Button onClick={onGetStarted} className="gradient-bg hover:opacity-90 text-primary-foreground">
            Entrar
          </Button>
        </nav>
        <Button onClick={onGetStarted} className="md:hidden gradient-bg hover:opacity-90 text-primary-foreground">
          Entrar
        </Button>
      </div>
    </header>
  );
};

export default LandingHeader;
