import React from 'react';
import { cn } from '@/lib/utils';

const BrandLogo = ({ as: Component = 'div', className, iconClassName, textClassName, compactOnMobile = false }) => (
  <Component className={cn('inline-flex items-center gap-2 leading-none', className)} aria-label="Procuro Pra Ti">
    <img src="/favicon.svg" alt="" aria-hidden="true" className={cn('h-8 w-8 shrink-0 rounded-lg', iconClassName)} />
    <span className={cn('relative -top-px inline-flex items-center whitespace-nowrap font-heading font-extrabold lowercase leading-none tracking-tight', compactOnMobile && 'hidden min-[350px]:inline-flex', textClassName)}>
      <span className="text-foreground">procuro</span>{' '}
      <span className="text-primary">pra ti</span>
    </span>
  </Component>
);

export default BrandLogo;
