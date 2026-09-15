import * as React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReactionButtonProps {
  hasReacted: boolean;
  count: number;
  onToggle: () => void | Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ReactionButton({
  hasReacted,
  count,
  onToggle,
  disabled = false,
  size = 'sm',
  className,
}: ReactionButtonProps) {
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={hasReacted ? 'Remove flame reaction' : 'Give flame reaction'}
      aria-pressed={hasReacted}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-full font-mono transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame-500/50',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
        hasReacted
          ? 'bg-flame-500/10 text-flame-600 dark:text-flame-400 font-semibold border border-flame-500/30'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/60',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <Flame
        className={cn(
          'transition-transform duration-200',
          size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
          hasReacted
            ? 'text-flame-500 fill-flame-500'
            : 'text-muted-foreground group-hover:text-foreground',
          isAnimating && 'scale-125 -rotate-6'
        )}
      />
      <span>{count}</span>
    </button>
  );
}
