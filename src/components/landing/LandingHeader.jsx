
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Store, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import BrandLogo from '@/components/BrandLogo';

const navLink = (id, scrollToSection, onNavigate) => (event) => {
  event.preventDefault();
  onNavigate?.();
  scrollToSection(id);
};

const NAV_ITEMS = [
  { id: 'como-funciona', label: 'Como Funciona' },
  { id: 'a-marca', label: 'A Marca' },
  { id: 'faq', label: 'FAQ' },
];

const LandingHeader = ({ onGetStarted, scrollToSection }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="safe-header py-3 sm:py-4 px-3 sm:px-4 shadow-md bg-card/90 backdrop-blur-md sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <BrandLogo as="h1" iconClassName="h-9 w-9 sm:h-10 sm:w-10" textClassName="text-xl sm:text-2xl" />
        </div>
        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map(({ id, label }) => (
            <a key={id} href={`#${id}`} onClick={navLink(id, scrollToSection)} className="text-muted-foreground hover:text-primary transition-colors">{label}</a>
          ))}
          <Button onClick={() => onGetStarted('user')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Vou procurar
          </Button>
          <Button onClick={() => onGetStarted('company')} variant="outline" className="border-accent-agile-text text-accent-agile-text font-semibold hover:bg-accent-agile-text/10">
            <Store className="h-4 w-4 mr-2" />
            Vou vender
          </Button>
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen(open => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {isMenuOpen && (
          <nav id="mobile-nav-menu" className="md:hidden w-full flex flex-col gap-1 pt-1">
            {NAV_ITEMS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={navLink(id, scrollToSection, closeMenu)}
                className="rounded-lg px-3 py-2.5 text-foreground hover:bg-secondary transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
        )}
        <div className="md:hidden grid grid-cols-2 gap-2 w-full">
          <Button onClick={() => onGetStarted('user')} className="w-full h-auto min-h-11 whitespace-normal bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 text-sm">
            Vou procurar
          </Button>
          <Button onClick={() => onGetStarted('company')} variant="outline" className="w-full h-auto min-h-11 whitespace-normal border-accent-agile-text text-accent-agile-text font-semibold hover:bg-accent-agile-text/10 px-3 py-2 text-sm">
            <Store className="h-4 w-4 mr-2" />
            Vou vender
          </Button>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
