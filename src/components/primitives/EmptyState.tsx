import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState = ({
  className,
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  ...props
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border/80 bg-card/50 max-w-lg mx-auto my-6',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground/70">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-foreground tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-5 flex items-center gap-3">
          {secondaryActionLabel && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {actionLabel && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
