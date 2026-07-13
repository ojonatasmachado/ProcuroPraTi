
import React from 'react';
import { Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';

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

const LandingFooter = ({ scrollToSection }) => {
  return (
    <footer className="py-12 px-4 bg-card border-t border-border">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full gradient-bg">
                <AutoPartsLogo className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Procuro Pra Ti
              </span>
            </div>
            <p className="text-muted-foreground mb-4">
              A plataforma mais confiável para conectar você às melhores peças automotivas de CDVs especializados em todo o Brasil.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors">
                <Facebook className="h-5 w-5 text-primary" />
              </a>
              <a href="#" className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors">
                <Instagram className="h-5 w-5 text-primary" />
              </a>
              <a href="#" className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors">
                <Twitter className="h-5 w-5 text-primary" />
              </a>
            </div>
          </div>
          
          <div>
            <span className="font-semibold text-primary mb-4 block">Links Rápidos</span>
            <div className="space-y-2">
              <button onClick={() => scrollToSection('como-funciona')} className="block text-muted-foreground hover:text-primary transition-colors">Sobre nós</button>
              <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">Termos de uso</a>
              <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">Política de Privacidade</a>
            </div>
          </div>
          
          <div>
            <span className="font-semibold text-primary mb-4 block">Contato</span>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>contato@procuroprati.com</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>(11) 9999-9999</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 text-center">
          <p className="text-muted-foreground">
            © 2024 Procuro Pra Ti. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
