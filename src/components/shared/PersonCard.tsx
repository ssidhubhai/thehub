import * as React from 'react';
import { User } from '@/types/user';
import { Avatar, Button, Badge } from '@/components/primitives';
import { VerifiedBadge } from '@/components/primitives/VerifiedBadge';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { UserCheck, UserPlus, Clock, MessageSquare, BookOpen, Hammer, HelpCircle } from 'lucide-react';
import { toast } from '@/components/primitives/Toast';
import { cn } from '@/lib/utils';

export interface PersonCardProps {
  person: User;
  onSelect?: (userId: string) => void;
  onOpenDirectChat?: (userId: string) => void;
  className?: string;
}

export function PersonCard({
  person,
  onSelect,
  onOpenDirectChat,
  className,
}: PersonCardProps) {
  const { user: currentUser } = useAuthStore();
  const {
    connections,
    getConnectionStatus,
    sendConnectionRequest,
    acceptConnection,
    declineConnection,
  } = usePeopleStore();

  const isSelf = currentUser?.id === person.id;
  const status = isSelf ? 'none' : getConnectionStatus(person.id);

  const isPersonMod =
    person.role === 'moderator' ||
    person.role === 'admin' ||
    person.profile?.role === 'moderator' ||
    person.username === 'sidhu001';
  const isCurrentMod =
    currentUser?.role === 'moderator' ||
    currentUser?.role === 'admin' ||
    currentUser?.profile?.role === 'moderator' ||
    currentUser?.username === 'sidhu001';
  const canDirectChat = status === 'accepted' || isPersonMod || isCurrentMod;

  // Find incoming connection ID if pending_received
  const incomingConn = React.useMemo(() => {
    if (status !== 'pending_received' || !currentUser) return null;
    return connections.find(
      (c) => c.senderId === person.id && c.recipientId === currentUser.id && c.status === 'pending'
    );
  }, [connections, status, person.id, currentUser]);

  const [isLoading, setIsLoading] = React.useState(false);

  const handleConnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await sendConnectionRequest(person.id);
      toast.flame('Connection Requested', `Invitation sent to ${person.profile.displayName}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send connection request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!incomingConn) return;
    setIsLoading(true);
    try {
      await acceptConnection(incomingConn.id);
      toast.flame('Connection Accepted', `You and ${person.profile.displayName} are now connected.`);
    } catch {
      toast.error('Failed to accept connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!incomingConn) return;
    setIsLoading(true);
    try {
      await declineConnection(incomingConn.id);
      toast.info('Connection Declined');
    } catch {
      toast.error('Failed to decline connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDirectChat?.(person.id);
  };

  return (
    <div
      onClick={() => onSelect?.(person.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(person.id)}
      className={cn(
        'group flex flex-col justify-between rounded-2xl border bg-card p-5 text-left transition-all duration-200',
        isPersonMod
          ? 'border-sky-500/30 bg-sky-500/[0.01] hover:border-sky-500/50 hover:shadow-subtle'
          : 'border-border/80 hover:border-border hover:shadow-subtle',
        'cursor-pointer space-y-4',
        className
      )}
    >
      {/* Header: Avatar, Name, Handle, Status */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Avatar
            src={person.profile.avatarUrl}
            name={person.profile.displayName}
            size="lg"
            showPresence
            isOnline
            className="group-hover:scale-105 transition-transform"
          />

          {/* Action Button depending on Connection Status */}
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 flex-wrap justify-end">
            {isSelf ? (
              <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                You
              </Badge>
            ) : status === 'accepted' ? (
              <div className="flex items-center gap-1.5">
                <Badge variant="success" size="sm" className="font-mono text-[10px] gap-1">
                  <UserCheck className="h-3 w-3" />
                  Connected
                </Badge>
                {onOpenDirectChat && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMessage}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="Send Direct Message"
                    aria-label={`Send direct message to ${person.profile.displayName}`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ) : status === 'pending_sent' ? (
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" size="sm" className="font-mono text-[10px] gap-1">
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
                {canDirectChat && onOpenDirectChat && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMessage}
                    className="h-7 px-2 text-[11px] font-mono text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10 gap-1"
                    title="Message Moderator"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Ask
                  </Button>
                )}
              </div>
            ) : status === 'pending_received' ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="flame"
                  size="sm"
                  onClick={handleAccept}
                  disabled={isLoading}
                  className="h-7 px-2 text-[11px]"
                >
                  Accept
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDecline}
                  disabled={isLoading}
                  className="h-7 px-2 text-[11px]"
                >
                  Decline
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {canDirectChat && onOpenDirectChat && isPersonMod && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMessage}
                    className="h-7 px-2 text-[11px] font-mono text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10 gap-1"
                    title="Ask Moderator for Help"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Ask Help
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnect}
                  disabled={isLoading}
                  iconPrefix={<UserPlus className="h-3 w-3" />}
                  className="h-7 px-2.5 text-[11px] font-mono"
                >
                  Connect
                </Button>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-display font-bold text-base text-foreground group-hover:underline">
              {person.profile.displayName}
            </h3>
            <VerifiedBadge
              role={person.role || person.profile?.role}
              isVerified={person.isVerified || person.profile?.isVerified || person.username === 'sidhu001'}
              showRoleTag
              size="sm"
            />
          </div>
          <p className="font-mono text-xs text-muted-foreground">@{person.username}</p>
        </div>

        {/* Bio */}
        <p className="text-xs text-muted-foreground font-sans line-clamp-2 leading-relaxed">
          {person.profile.bio || 'Exploring ideas, learning in public, and building with others.'}
        </p>

        {/* Current Focus: Learning / Building snippet */}
        {(person.profile.currentlyBuilding || person.profile.currentlyLearning) && (
          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50 text-[11px] space-y-1">
            {person.profile.currentlyBuilding && (
              <div className="flex items-center gap-1.5 text-foreground/80 truncate">
                <Hammer className="h-3 w-3 text-flame-500 shrink-0" />
                <span className="truncate">Building: {person.profile.currentlyBuilding}</span>
              </div>
            )}
            {person.profile.currentlyLearning && (
              <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                <BookOpen className="h-3 w-3 text-flame-500 shrink-0" />
                <span className="truncate">Learning: {person.profile.currentlyLearning}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interest Tags */}
      {person.profile.interests && person.profile.interests.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
          {person.profile.interests.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="font-mono text-[10px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full border border-border/40"
            >
              #{tag}
            </span>
          ))}
          {person.profile.interests.length > 3 && (
            <span className="font-mono text-[10px] text-muted-foreground/60 self-center px-1">
              +{person.profile.interests.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
