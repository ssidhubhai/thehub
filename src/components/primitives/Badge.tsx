import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'accent' | 'flame' | 'success' | 'warning' | 'destructive';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  mono?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'sm',
      mono = false,
      removable = false,
      onRemove,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<BadgeVariant, string> = {
      default: 'bg-primary text-primary-foreground border-transparent',
      secondary: 'bg-secondary text-secondary-foreground border-border/60 hover:bg-secondary/80',
      outline: 'bg-transparent text-foreground border-border hover:bg-secondary/40',
      accent: 'bg-accent text-accent-foreground border-border/80',
      flame: 'bg-flame-50 text-flame-600 border-flame-200 dark:bg-flame-950/40 dark:text-flame-400 dark:border-flame-800',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
      destructive: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-[11px] rounded-md gap-1',
      md: 'px-2.5 py-1 text-xs rounded-md gap-1.5',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium border transition-colors select-none',
          variantStyles[variant],
          sizeStyles[size],
          mono && 'font-mono tracking-tight',
          className
        )}
        {...props}
      >
        <span>{children}</span>
        {removable && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Remove badge"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
