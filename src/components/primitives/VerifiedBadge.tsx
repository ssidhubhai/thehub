import * as React from 'react';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VerifiedBadgeProps {
  role?: 'member' | 'moderator' | 'admin';
  isVerified?: boolean;
  showRoleTag?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  role,
  isVerified,
  showRoleTag = false,
  className,
  size = 'md',
}) => {
  const isMod = role === 'moderator' || role === 'admin';
  const verified = isVerified || isMod;

  if (!verified && !isMod) return null;

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-4.5 w-4.5',
  };

  return (
    <span
      className={cn('inline-flex items-center gap-1 align-middle select-none', className)}
      title={isMod ? 'Community Moderator & Lead' : 'Verified Builder'}
    >
      <BadgeCheck
        className={cn(
          iconSizes[size],
          'text-sky-500 fill-sky-500/15 dark:text-sky-400 dark:fill-sky-400/20 shrink-0'
        )}
        aria-label="Verified Account"
      />
      {showRoleTag && isMod && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 font-mono text-[9px] font-bold tracking-tight rounded bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-500/30">
          <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
          MOD
        </span>
      )}
    </span>
  );
};
