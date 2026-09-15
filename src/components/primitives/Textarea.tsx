import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  monoLabel?: boolean;
  showCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      monoLabel = true,
      showCount = false,
      maxLength,
      value,
      defaultValue,
      onChange,
      id,
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const [charLength, setCharLength] = React.useState<number>(() => {
      if (typeof value === 'string') return value.length;
      if (typeof defaultValue === 'string') return defaultValue.length;
      return 0;
    });

    React.useEffect(() => {
      if (typeof value === 'string') {
        setCharLength(value.length);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharLength(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div className="w-full space-y-1.5 text-left">
        <div className="flex items-center justify-between">
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
          {showCount && maxLength && (
            <span
              className={cn(
                'text-[11px] font-mono',
                charLength >= maxLength ? 'text-destructive font-semibold' : 'text-muted-foreground'
              )}
            >
              {charLength}/{maxLength}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'w-full p-3 bg-background text-foreground text-sm rounded-md border border-input shadow-subtle placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:border-foreground resize-y disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/30',
            className
          )}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
