import * as React from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { Conversation } from '@/types/message';
import { ChatRoom } from './ChatRoom';
import { CreateGroupModal } from './CreateGroupModal';
import {
  Avatar,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  Skeleton,
} from '@/components/primitives';
import {
  MessageSquare,
  Users,
  Search,
  Plus,
  Flame,
  FolderGit2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export interface MessagingViewProps {
  initialConversationId?: string | null;
  onNavigateToUser?: (userId: string) => void;
}

export function MessagingView({
  initialConversationId,
  onNavigateToUser,
}: MessagingViewProps) {
  const { user } = useAuthStore();
  const { people, fetchPeople } = usePeopleStore();
  const {
    conversations,
    activeConversationId,
    activeTab,
    fetchConversations,
    setActiveConversation,
    setActiveTab,
    isLoading,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = React.useState(false);
  const handledInitialRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    fetchConversations();
    fetchPeople();
  }, [fetchConversations, fetchPeople]);

  // Handle initial conversation deep link or default selection on desktop once
  React.useEffect(() => {
    if (initialConversationId && handledInitialRef.current !== initialConversationId) {
      handledInitialRef.current = initialConversationId;
      setActiveConversation(initialConversationId);
      // Auto-switch tab to match conversation type if possible
      const targetConv = conversations.find((c) => c.id === initialConversationId);
      if (targetConv) {
        if (targetConv.type === 'direct') {
          setActiveTab('private');
        } else {
          setActiveTab('groups');
        }
      }
    } else if (!activeConversationId && conversations.length > 0) {
      // Only auto-select General chat on desktop screens (md: 768px+) so mobile users see their conversation list first
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      if (isDesktop) {
        const generalChat = conversations.find((c) => c.type === 'general');
        if (generalChat) {
          setActiveConversation(generalChat.id);
        }
      }
    }
  }, [initialConversationId, conversations, activeConversationId, setActiveConversation, setActiveTab]);

  // Active conversation object
  const activeConversation = React.useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Helper to resolve conversation display info
  const getConversationInfo = (conv: Conversation) => {
    if (conv.type === 'direct') {
      const otherId = conv.participantIds.find((id) => id !== user?.id);
      const otherUser = people.find((p) => p.id === otherId);
      return {
        title: otherUser?.profile.displayName || 'Direct Chat',
        subtitle: otherUser ? `@${otherUser.username}` : '',
        avatarUrl: otherUser?.profile.avatarUrl,
        initials: otherUser?.profile.displayName,
        isOnline: true,
        typeLabel: 'Direct',
      };
    }

    return {
      title: conv.title || 'Group Chat',
      subtitle: `${conv.participantIds.length} members`,
      avatarUrl: undefined,
      initials: conv.title,
      isOnline: false,
      typeLabel: conv.type === 'general' ? 'General' : conv.type === 'project_group' ? 'Project' : 'Group',
    };
  };

  // Filter conversations by search and tab
  const filteredConversations = React.useMemo(() => {
    return conversations.filter((c) => {
      // Tab filter (F70)
      const matchesTab =
        activeTab === 'private'
          ? c.type === 'direct'
          : c.type === 'general' || c.type === 'custom_group' || c.type === 'project_group';

      if (!matchesTab) return false;

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const info = getConversationInfo(c);
      return (
        info.title.toLowerCase().includes(q) ||
        info.subtitle.toLowerCase().includes(q) ||
        (c.lastMessage?.content && c.lastMessage.content.toLowerCase().includes(q))
      );
    });
  }, [conversations, activeTab, searchQuery, user, people]);

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col text-left overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-5 h-full min-h-0 flex-1">
        {/* Left Column: Conversation Sidebar (md:col-span-5 lg:col-span-4) */}
        <div
          className={cn(
            'md:col-span-5 lg:col-span-4 flex flex-col h-full min-h-0 rounded-2xl border border-border/80 bg-card p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-hidden',
            activeConversationId ? 'hidden md:flex' : 'flex'
          )}
        >
          {/* Header & New Group Action */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-flame-500" />
              <h2 className="font-display font-bold text-lg text-foreground">Messages</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateGroupOpen(true)}
              iconPrefix={<Plus className="h-3.5 w-3.5" />}
              className="text-xs h-7 px-2.5 font-mono"
            >
              New Group
            </Button>
          </div>

          {/* Search Conversations */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter conversations..."
              className={cn(
                'w-full rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground',
                'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-flame-500'
              )}
            />
          </div>

          {/* Partitioning Tabs: Private vs Groups (F70) */}
          <div className="shrink-0">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as 'private' | 'groups')}
              className="w-full"
            >
              <TabsList variant="pills" className="w-full grid grid-cols-2 p-1 bg-muted/40">
                <TabsTrigger value="groups" variant="pills" className="text-xs py-1">
                  Groups
                </TabsTrigger>
                <TabsTrigger value="private" variant="pills" className="text-xs py-1">
                  Direct Messages
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversation List (Independent scroll) */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 overscroll-contain">
            {isLoading && conversations.length === 0 ? (
              <div className="space-y-2 pt-2">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="font-mono text-xs text-muted-foreground">
                  {activeTab === 'private'
                    ? 'No direct conversations yet. Connect with members in People to unlock 1-on-1 chat.'
                    : 'No group conversations found.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const info = getConversationInfo(conv);
                const isActive = conv.id === activeConversationId;
                const unreadCount = (user && conv.unreadCounts[user.id]) || 0;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversation(conv.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setActiveConversation(conv.id)}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border text-left',
                      isActive
                        ? 'bg-muted/80 border-border shadow-sm'
                        : 'border-transparent hover:bg-muted/40 hover:border-border/50'
                    )}
                  >
                    {conv.type === 'direct' ? (
                      <Avatar
                        src={info.avatarUrl}
                        name={info.title}
                        size="sm"
                        showPresence
                        isOnline
                        className="mt-0.5 shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                        {conv.type === 'general' ? (
                          <Flame className="h-4 w-4 text-flame-500 fill-flame-500" />
                        ) : conv.type === 'project_group' ? (
                          <FolderGit2 className="h-4 w-4 text-flame-500" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-bold text-xs text-foreground truncate">
                          {info.title}
                        </span>
                        {conv.lastMessage && (
                          <time className="font-mono text-[9px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                              addSuffix: false,
                            })}
                          </time>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground font-sans truncate">
                        {conv.lastMessage
                          ? `${conv.lastMessage.senderDisplayName}: ${conv.lastMessage.content}`
                          : info.subtitle || 'No messages yet'}
                      </p>
                    </div>

                    {unreadCount > 0 && (
                      <span className="h-4 w-4 rounded-full bg-flame-500 text-white font-mono text-[9px] font-bold flex items-center justify-center shrink-0 self-center">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Room or Empty State (md:col-span-7 lg:col-span-8) */}
        <div
          className={cn(
            'md:col-span-7 lg:col-span-8 h-full min-h-0 overflow-hidden',
            !activeConversationId ? 'hidden md:flex flex-col' : 'flex flex-col'
          )}
        >
          {activeConversation ? (
            <ChatRoom
              conversation={activeConversation}
              onBack={() => setActiveConversation(null)}
              onNavigateToUser={onNavigateToUser}
              className="h-full"
            />
          ) : (
            <div className="h-full rounded-2xl border border-border/80 bg-card flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-muted/40 border border-border flex items-center justify-center text-muted-foreground">
                <MessageSquare className="h-6 w-6 text-flame-500" />
              </div>
              <h3 className="font-display font-bold text-base text-foreground">
                Select a conversation
              </h3>
              <p className="text-xs text-muted-foreground font-mono max-w-sm">
                Choose a direct message or group channel from the left sidebar to start chatting.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        onGroupCreated={(id) => setActiveConversation(id)}
      />
    </div>
  );
}
