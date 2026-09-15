import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'flame';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  iconPrefix?: React.ReactNode;
  iconSuffix?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      iconPrefix,
      iconSuffix,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] shadow-sm',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-accent/80 active:scale-[0.98]',
      outline:
        'border border-border bg-transparent text-foreground hover:bg-secondary/60 active:scale-[0.98]',
      ghost:
        'bg-transparent text-foreground hover:bg-secondary/70 active:scale-[0.98]',
      destructive:
        'bg-destructive text-destructive-foreground hover:opacity-90 active:scale-[0.98]',
      flame:
        'bg-flame-500 text-white hover:bg-flame-600 active:scale-[0.98] shadow-glow-flame',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-xs rounded-md gap-1.5 font-medium',
      md: 'h-10 px-4 text-sm rounded-md gap-2 font-medium',
      lg: 'h-12 px-6 text-base rounded-md gap-2.5 font-semibold',
      icon: 'h-9 w-9 p-0 rounded-md flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 select-none disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-current" />
            {children && <span>{children}</span>}
          </>
        ) : (
          <>
            {iconPrefix && <span className="inline-flex shrink-0">{iconPrefix}</span>}
            {children}
            {iconSuffix && <span className="inline-flex shrink-0">{iconSuffix}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
