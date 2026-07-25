import React from 'react';
import { cn } from '@/lib/utils';

export const PhoneMockup = ({ src, alt, className }) => (
  <div className={cn('relative mx-auto w-full max-w-[220px] sm:max-w-[240px]', className)}>
    <div className="relative rounded-[2rem] border-[6px] border-foreground/90 bg-foreground/90 p-1.5 shadow-xl">
      <div className="absolute left-1/2 top-2 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-foreground/60" aria-hidden="true" />
      <div className="aspect-[9/19.3] w-full overflow-hidden rounded-[1.5rem] bg-background">
        <img src={src} alt={alt} className="h-full w-full object-cover object-top" loading="lazy" />
      </div>
    </div>
  </div>
);

export const BrowserMockup = ({ src, alt, className }) => (
  <div className={cn('relative mx-auto w-full max-w-md sm:max-w-lg', className)}>
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3 py-2" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
      </div>
      <div className="aspect-[16/11] w-full overflow-hidden bg-background">
        <img src={src} alt={alt} className="h-full w-full object-cover object-top" loading="lazy" />
      </div>
    </div>
  </div>
);
