import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const ThemeToggle = ({ className, showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const nextTheme = isDark ? 'claro' : 'escuro';

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? 'sm' : 'icon'}
      onClick={toggleTheme}
      className={cn('bg-card/90 text-foreground shadow-sm hover:bg-primary/10 hover:text-primary', className)}
      aria-label={`Ativar tema ${nextTheme}`}
      title={`Ativar tema ${nextTheme}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {showLabel && <span className="ml-2">{isDark ? 'Tema claro' : 'Tema escuro'}</span>}
    </Button>
  );
};

export default ThemeToggle;
