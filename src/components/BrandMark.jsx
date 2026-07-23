import React from 'react';
import { cn } from '@/lib/utils';

const BrandMark = ({ className, alt = '' }) => (
  <img
    src="/favicon.svg"
    alt={alt}
    aria-hidden={alt ? undefined : true}
    className={cn('h-5 w-5 shrink-0 rounded-md', className)}
  />
);

export default BrandMark;
