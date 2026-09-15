import * as React from 'react';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { InAppNotification, NotificationType } from '@/types/notification';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  Avatar,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/primitives';
import {
  Bell,
  CheckCheck,
  UserPlus,
  UserCheck,
  MessageSquare,
  Flame,
  Sparkles,
  Users,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToTarget?: (url: string, notification: InAppNotification) => void;
}

export function NotificationDrawer({
  open,
  onOpenChange,
  onNavigateToTarget,
}: NotificationDrawerProps) {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const [filterTab, setFilterTab] = React.useState<'all' | 'connections' | 'projects' | 'posts'>('all');

  React.useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const handleNotificationClick = async (notif: InAppNotification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    onOpenChange(false);
    onNavigateToTarget?.(notif.payload.deepLinkUrl, notif);
  };

  // Filter notifications by tab
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((n) => {
      if (filterTab === 'connections') {
        return n.type === 'connection_request' || n.type === 'connection_accepted';
      }
      if (filterTab === 'projects') {
        return n.type === 'project_interest';
      }
      if (filterTab === 'posts') {
        return n.type === 'post_reply' || n.type === 'post_reaction';
      }
      return true;
    });
  }, [notifications, filterTab]);

  const getEventIcon = (type: NotificationType) => {
    switch (type) {
      case 'connection_request':
        return <UserPlus className="h-3.5 w-3.5 text-blue-500" />;
      case 'connection_accepted':
        return <UserCheck className="h-3.5 w-3.5 text-success" />;
      case 'post_reply':
        return <MessageSquare className="h-3.5 w-3.5 text-flame-500" />;
      case 'post_reaction':
        return <Flame className="h-3.5 w-3.5 text-flame-500 fill-flame-500" />;
      case 'project_interest':
        return <Sparkles className="h-3.5 w-3.5 text-amber-500" />;
      case 'group_invitation':
        return <Users className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getEventText = (notif: InAppNotification) => {
    const actor = notif.payload.actorName;
    switch (notif.type) {
      case 'connection_request':
        return `${actor} sent you a connection request.`;
      case 'connection_accepted':
        return `${actor} accepted your connection request. Direct messaging is now unlocked!`;
      case 'post_reply':
        return `${actor} replied to your post: "${notif.payload.messageSnippet || 'New reply'}"`;
      case 'post_reaction':
        return `${actor} reacted with 🔥 to your post.`;
      case 'project_interest':
        return `${actor} expressed interest in your project "${notif.payload.targetTitle || 'Project'}".`;
      case 'group_invitation':
        return `${actor} added you to "${notif.payload.targetTitle || 'a group'}".`;
      default:
        return 'You have a new update.';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        {/* Header */}
        <div className="p-5 border-b border-border/70 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="font-display font-bold text-lg flex items-center gap-2 text-foreground">
                <Bell className="h-4 w-4 text-flame-500" />
                <span>Notifications</span>
              </SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="flame" size="sm" className="font-mono text-[10px]">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                iconPrefix={<CheckCheck className="h-3.5 w-3.5" />}
                className="text-xs h-7 px-2 font-mono text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs text-muted-foreground font-sans">
            Meaningful community signals: connections, post responses, and project collaboration.
          </SheetDescription>

          {/* Filter Tabs */}
          <Tabs
            value={filterTab}
            onValueChange={(v) => setFilterTab(v as any)}
            className="w-full pt-1"
          >
            <TabsList variant="pills" className="w-full grid grid-cols-4 p-1 bg-muted/40 text-[11px]">
              <TabsTrigger value="all" variant="pills" className="py-1">
                All
              </TabsTrigger>
              <TabsTrigger value="connections" variant="pills" className="py-1">
                Connects
              </TabsTrigger>
              <TabsTrigger value="projects" variant="pills" className="py-1">
                Projects
              </TabsTrigger>
              <TabsTrigger value="posts" variant="pills" className="py-1">
                Threads
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-left">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="h-10 w-10 rounded-2xl bg-muted/40 border border-border flex items-center justify-center text-muted-foreground mx-auto">
                <Bell className="h-5 w-5" />
              </div>
              <p className="font-display font-semibold text-sm text-foreground">
                All caught up
              </p>
              <p className="font-mono text-xs text-muted-foreground max-w-xs mx-auto">
                No notifications right now. Check back as builders engage with your work.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notif)}
                className={cn(
                  'flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all border text-left group',
                  notif.isRead
                    ? 'border-transparent hover:bg-muted/40'
                    : 'bg-flame-500/5 border-flame-500/20 hover:bg-flame-500/10'
                )}
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={notif.payload.actorAvatarUrl}
                    name={notif.payload.actorName}
                    size="sm"
                  />
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center shadow-xs">
                    {getEventIcon(notif.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-foreground/90 font-sans leading-relaxed">
                    {getEventText(notif)}
                  </p>
                  <div className="flex items-center gap-2">
                    <time className="font-mono text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </time>
                    <span className="font-mono text-[10px] text-flame-600 dark:text-flame-400 group-hover:underline flex items-center gap-0.5">
                      <span>View</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>

                {!notif.isRead && (
                  <span className="h-2 w-2 rounded-full bg-flame-500 shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
