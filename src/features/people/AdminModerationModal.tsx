import * as React from 'react';
import { User, UserModerationStatus } from '@/types/user';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { Button, Badge } from '@/components/primitives';
import { toast } from '@/components/primitives/Toast';
import {
  ShieldAlert,
  X,
  CheckCircle2,
  VolumeX,
  PauseCircle,
  Ban,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AdminModerationModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedUser: User) => void;
}

export function AdminModerationModal({
  user,
  isOpen,
  onClose,
  onSuccess,
}: AdminModerationModalProps) {
  const { updateUserModeration } = usePeopleStore();

  const [selectedStatus, setSelectedStatus] = React.useState<UserModerationStatus>(
    user.moderationStatus || 'active'
  );
  const [reason, setReason] = React.useState(user.moderationReason || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedStatus(user.moderationStatus || 'active');
      setReason(user.moderationReason || '');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updated = await updateUserModeration(user.id, selectedStatus, reason.trim());
      toast.flame(
        'User Status Updated',
        `${user.profile.displayName} is now set to "${selectedStatus.toUpperCase()}".`
      );
      onSuccess?.(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user moderation status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const options: {
    status: UserModerationStatus;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    badgeVariant: 'success' | 'warning' | 'destructive' | 'outline';
  }[] = [
    {
      status: 'active',
      title: 'Active / Unrestricted',
      description: 'Standard member with full permissions to post, chat, reply, and build.',
      icon: CheckCircle2,
      colorClass: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5',
      badgeVariant: 'success',
    },
    {
      status: 'muted',
      title: 'Mute Messaging & Comments',
      description: 'Restricts user from sending direct messages, chat messages, or post replies.',
      icon: VolumeX,
      colorClass: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
      badgeVariant: 'warning',
    },
    {
      status: 'paused',
      title: 'Pause Activity (Read-Only Mode)',
      description: 'Places account in read-only mode. User can view content but cannot post, chat, comment, or react.',
      icon: PauseCircle,
      colorClass: 'text-orange-500 border-orange-500/30 bg-orange-500/5',
      badgeVariant: 'warning',
    },
    {
      status: 'banned',
      title: 'Ban Account (Block Access)',
      description: 'Completely suspends account and blocks the user from accessing the platform.',
      icon: Ban,
      colorClass: 'text-rose-500 border-rose-500/30 bg-rose-500/5',
      badgeVariant: 'destructive',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl text-left space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-flame-500/10 text-flame-500 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                <span>Admin Moderation Controls</span>
                <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                  Admin Only
                </Badge>
              </h2>
            </div>
          </div>
          <p className="font-sans text-xs text-muted-foreground">
            Enforce actions on <span className="font-semibold text-foreground">{user.profile.displayName}</span> (@{user.username}).
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Status Selection Cards */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Select Account Action Status
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {options.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedStatus === opt.status;

                return (
                  <button
                    key={opt.status}
                    type="button"
                    onClick={() => setSelectedStatus(opt.status)}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 relative',
                      isSelected
                        ? opt.colorClass + ' ring-2 ring-flame-500/50 shadow-sm'
                        : 'border-border/70 bg-muted/20 hover:border-border hover:bg-muted/40'
                    )}
                  >
                    <div
                      className={cn(
                        'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                        isSelected ? opt.colorClass : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-xs text-foreground">
                          {opt.title}
                        </span>
                        {isSelected && (
                          <span className="font-mono text-[10px] uppercase font-bold text-flame-500">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-[11px] text-muted-foreground leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason / Note Input */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Reason / Admin Note (Optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Sending spam in general chat, violating guidelines..."
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-flame-500/50"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="flame"
              size="sm"
              disabled={isSubmitting}
              iconPrefix={<ShieldAlert className="h-3.5 w-3.5" />}
            >
              {isSubmitting ? 'Applying...' : 'Apply Status Change'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
