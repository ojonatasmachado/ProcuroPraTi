import React from 'react';
import { cn } from '@/lib/utils';

export const PhoneMockup = ({ src, alt, size = 'lg', className }) => (
  <div className={cn('relative mx-auto w-full max-w-[220px] sm:max-w-[240px]', className)}>
    <div
      className={cn(
        'relative bg-foreground/90',
        size === 'lg'
          ? 'rounded-[2rem] border-[6px] p-1.5'
          : 'rounded-[1.4rem] border-[4px] p-1',
        'border-foreground/90 shadow-xl',
      )}
    >
      <div
        className={cn(
          'absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-foreground/60',
          size === 'lg' ? 'h-1.5 w-12' : 'h-1 w-8',
        )}
        aria-hidden="true"
      />
      <div className={cn('aspect-[9/19.3] w-full overflow-hidden bg-background', size === 'lg' ? 'rounded-[1.5rem]' : 'rounded-[1rem]')}>
        <img src={src} alt={alt} className="h-full w-full object-cover object-top" loading="lazy" />
      </div>
    </div>
  </div>
);

export const BrowserMockup = ({ src, alt, size = 'lg', className }) => (
  <div className={cn('relative mx-auto w-full max-w-md sm:max-w-lg', className)}>
    <div className={cn('overflow-hidden border border-border bg-card shadow-xl', size === 'lg' ? 'rounded-xl' : 'rounded-lg')}>
      <div
        className={cn('flex items-center gap-1.5 border-b border-border bg-muted', size === 'lg' ? 'px-3 py-2' : 'px-2 py-1.5')}
        aria-hidden="true"
      >
        <span className={cn('rounded-full bg-foreground/20', size === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2')} />
        <span className={cn('rounded-full bg-foreground/20', size === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2')} />
        <span className={cn('rounded-full bg-foreground/20', size === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2')} />
      </div>
      <div className="aspect-[16/11] w-full overflow-hidden bg-background">
        <img src={src} alt={alt} className="h-full w-full object-cover object-top" loading="lazy" />
      </div>
    </div>
  </div>
);
