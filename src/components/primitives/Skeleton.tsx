import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text' | 'card';
}

export const Skeleton = ({
  className,
  variant = 'rectangular',
  ...props
}: SkeletonProps) => {
  const variantStyles = {
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-4 w-full',
    card: 'rounded-xl p-5 border border-border/60',
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-secondary/80 dark:bg-secondary/40',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';
