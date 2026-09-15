import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  monoLabel?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      monoLabel = true,
      leadingIcon,
      trailingIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-xs font-medium text-foreground/80 tracking-wide',
              monoLabel && 'font-mono uppercase text-[11px] tracking-wider text-muted-foreground'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leadingIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
              {leadingIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'w-full h-10 px-3.5 bg-background text-foreground text-sm rounded-md border border-input shadow-subtle placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:border-foreground disabled:opacity-50 disabled:cursor-not-allowed',
              leadingIcon && 'pl-9',
              trailingIcon && 'pr-9',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/30',
              className
            )}
            {...props}
          />
          {trailingIcon && (
            <div className="absolute right-3 flex items-center text-muted-foreground">
              {trailingIcon}
            </div>
          )}
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-destructive font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
