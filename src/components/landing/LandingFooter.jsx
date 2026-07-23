
import React from 'react';
import { Mail } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

const LandingFooter = ({ scrollToSection }) => {
  return (
    <footer className="py-12 px-4 bg-card border-t border-border">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <BrandLogo className="mb-4" iconClassName="h-9 w-9" textClassName="text-xl" />
            <p className="text-muted-foreground mb-4">
              A plataforma que aproxima quem procura peças automotivas de empresas que podem atender.
            </p>
          </div>
          
          <div>
            <span className="font-semibold text-foreground mb-4 block">Links Rápidos</span>
            <div className="space-y-2">
              <button onClick={() => scrollToSection('a-marca')} className="block text-muted-foreground hover:text-primary transition-colors">Sobre nós</button>
              <p className="text-sm text-muted-foreground">Termos e privacidade disponíveis no cadastro</p>
            </div>
          </div>
          
          <div>
            <span className="font-semibold text-foreground mb-4 block">Contato</span>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground break-all">
                <Mail className="h-4 w-4" />
                <span>contato@procuroprati.com</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 text-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} procuro pra ti. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
