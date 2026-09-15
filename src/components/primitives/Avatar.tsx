import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, getInitials } from '@/lib/utils';
import { PresenceStatus } from '@/types/common';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string;
  name?: string;
  size?: AvatarSize;
  showPresence?: boolean;
  isOnline?: boolean;
  presenceStatus?: PresenceStatus;
}

/**
 * Checks if an avatar URL is a valid user-uploaded picture
 * Rather than a pre-seeded dummy placeholder image or stock photo.
 */
function isValidCustomAvatar(src?: string): boolean {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed) return false;

  // Stock photography / seed demo URLs should NOT be used as default avatar
  if (
    trimmed.includes('images.unsplash.com') ||
    trimmed.includes('unsplash.com') ||
    trimmed.includes('placeholder') ||
    trimmed.includes('avatar.placeholder') ||
    trimmed.includes('default-avatar') ||
    trimmed.includes('gravatar.com/avatar/00000000') ||
    trimmed.startsWith('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB') // dummy 1x1 base64
  ) {
    return false;
  }

  // Allow user uploaded base64 data images or user uploaded media
  if (trimmed.startsWith('data:image/') && trimmed.length > 100) return true;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/uploads/')) {
    return true;
  }

  return false;
}

export const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  (
    {
      className,
      src,
      name = '',
      size = 'md',
      showPresence = false,
      isOnline,
      presenceStatus,
      ...props
    },
    ref
  ) => {
    const sizeClasses: Record<AvatarSize, string> = {
      xs: 'h-6 w-6 text-[10px]',
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-xs sm:text-sm',
      lg: 'h-12 w-12 text-sm sm:text-base',
      xl: 'h-16 w-16 text-lg sm:text-xl',
    };

    const dotSizeClasses: Record<AvatarSize, string> = {
      xs: 'h-1.5 w-1.5 ring-1',
      sm: 'h-2 w-2 ring-1.5',
      md: 'h-2.5 w-2.5 ring-2',
      lg: 'h-3 w-3 ring-2',
      xl: 'h-3.5 w-3.5 ring-2',
    };

    const initials = getInitials(name);
    const hasCustomAvatar = isValidCustomAvatar(src);

    // Derive online/away/offline
    const effectiveStatus: PresenceStatus =
      presenceStatus !== undefined
        ? presenceStatus
        : isOnline !== undefined
        ? isOnline
          ? 'online'
          : 'offline'
        : 'offline';

    const statusColorClasses: Record<PresenceStatus, string> = {
      online: 'bg-emerald-500',
      away: 'bg-amber-500',
      offline: 'bg-stone-400 dark:bg-stone-600',
    };

    return (
      <div className="relative inline-flex shrink-0">
        <AvatarPrimitive.Root
          ref={ref}
          className={cn(
            'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted select-none',
            sizeClasses[size],
            className
          )}
          {...props}
        >
          {hasCustomAvatar && src ? (
            <AvatarPrimitive.Image
              src={src}
              alt={name || 'User Avatar'}
              className="aspect-square h-full w-full object-cover"
            />
          ) : null}
          <AvatarPrimitive.Fallback
            delayMs={hasCustomAvatar ? 600 : 0}
            className="flex h-full w-full items-center justify-center bg-secondary font-mono font-semibold text-secondary-foreground"
          >
            {initials}
          </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>

        {showPresence && (
          <span
            aria-label={`Presence: ${effectiveStatus}`}
            className={cn(
              'absolute bottom-0 right-0 rounded-full ring-background transition-colors duration-200',
              statusColorClasses[effectiveStatus],
              dotSizeClasses[size]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
