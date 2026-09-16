import * as React from 'react';
import { Conversation, Message } from '@/types/message';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';
import { usePeopleStore } from '@/stores/usePeopleStore';
import {
  Avatar,
  Button,
  Badge,
  ConfirmModal,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/primitives';
import { VerifiedBadge } from '@/components/primitives/VerifiedBadge';
import {
  ArrowLeft,
  Send,
  Users,
  Copy,
  Check,
  UserPlus,
  Lock,
  Sparkles,
  Image as ImageIcon,
  X,
  Pencil,
  Trash2,
  MoreVertical,
  Bell,
  BellOff,
  UserX,
  UserCheck,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/primitives/Toast';
import { cn } from '@/lib/utils';

export interface ChatRoomProps {
  conversation: Conversation;
  onBack?: () => void;
  onNavigateToUser?: (userId: string) => void;
  className?: string;
}

export function ChatRoom({
  conversation,
  onBack,
  onNavigateToUser,
  className,
}: ChatRoomProps) {
  const { user } = useAuthStore();
  const {
    messages,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    isSending,
    toggleBlockUser,
    toggleMuteConversation,
    isUserBlocked,
    isConversationMuted,
  } = useChatStore();
  const { people, canMessage, sendConnectionRequest } = usePeopleStore();

  const [inputContent, setInputContent] = React.useState('');
  const [attachedImage, setAttachedImage] = React.useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = React.useState<string | null>(null);
  const [isRequestingConnection, setIsRequestingConnection] = React.useState(false);

  // Edit message state
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  // Delete message confirmation state
  const [deletingMessage, setDeletingMessage] = React.useState<Message | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Highlight message when clicked from pinned banner
  const [highlightedMessageId, setHighlightedMessageId] = React.useState<string | null>(null);

  // Un-hide temporarily specific blocked messages
  const [revealedBlockedMessageIds, setRevealedBlockedMessageIds] = React.useState<string[]>([]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const editInputRef = React.useRef<HTMLInputElement>(null);
  const convMessages = messages[conversation.id] || [];

  const isMuted = isConversationMuted(conversation.id);

  const isModerator =
    user?.role === 'moderator' ||
    user?.role === 'admin' ||
    user?.profile?.role === 'moderator' ||
    user?.username === 'sidhu001';

  // Find currently pinned message
  const pinnedMessage = React.useMemo(() => {
    if (conversation.pinnedMessageId) {
      const found = convMessages.find((m) => m.id === conversation.pinnedMessageId);
      if (found) return found;
    }
    return convMessages.find((m) => m.isPinned) || null;
  }, [conversation.pinnedMessageId, convMessages]);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const maxDim = 1000;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setAttachedImage(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setAttachedImage(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Fetch messages when conversation changes
  React.useEffect(() => {
    fetchMessages(conversation.id);
    setEditingMessageId(null);
    setEditContent('');
    setDeletingMessage(null);
  }, [conversation.id, fetchMessages]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages.length]);

  // Auto-focus edit input when opened
  React.useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

  // If 1-on-1 direct chat, find other user
  const otherUserId = React.useMemo(() => {
    if (conversation.type !== 'direct' || !user) return null;
    return conversation.participantIds.find((id) => id !== user.id) || null;
  }, [conversation, user]);

  const otherUser = React.useMemo(() => {
    if (!otherUserId) return null;
    return people.find((p) => p.id === otherUserId) || null;
  }, [otherUserId, people]);

  const isOtherUserBlocked = otherUserId ? isUserBlocked(otherUserId) : false;

  // Check messaging gate
  const isDirectChatGated = React.useMemo(() => {
    if (conversation.type !== 'direct' || !otherUserId) return false;
    return !canMessage(otherUserId);
  }, [conversation.type, otherUserId, canMessage]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputContent.trim() && !attachedImage) || isSending || isDirectChatGated) return;

    const text = inputContent.trim();
    const img = attachedImage;
    setInputContent('');
    setAttachedImage(null);
    try {
      await sendMessage(conversation.id, text, undefined, img || undefined);
    } catch {
      toast.error('Failed to send message');
      setInputContent(text);
      setAttachedImage(img);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
    toast.flame('Copied', 'Message copied to clipboard.');
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;
    setIsSavingEdit(true);
    try {
      await editMessage(conversation.id, editingMessageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent('');
      toast.flame('Message Edited', 'Your message has been updated.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to edit message');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMessage) return;
    setIsDeleting(true);
    try {
      await deleteMessage(conversation.id, deletingMessage.id);
      setDeletingMessage(null);
      toast.flame('Message Deleted', 'The message has been removed.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePin = async (msgId: string) => {
    const isCurrentlyPinned = conversation.pinnedMessageId === msgId || pinnedMessage?.id === msgId;
    const targetId = isCurrentlyPinned ? null : msgId;
    try {
      await pinMessage(conversation.id, targetId);
      if (targetId) {
        toast.flame('Message Pinned', 'Pinned to the top of this conversation.');
      } else {
        toast.flame('Message Unpinned', 'Removed from conversation header.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update pinned message');
    }
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`chat-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(msgId);
      setTimeout(() => setHighlightedMessageId(null), 2500);
    }
  };

  const handleToggleBlock = (targetId: string, displayName: string) => {
    toggleBlockUser(targetId);
    const nowBlocked = !isUserBlocked(targetId);
    if (nowBlocked) {
      toast.flame('User Blocked', `Messages from ${displayName} are now hidden.`);
    } else {
      toast.flame('User Unblocked', `Messages from ${displayName} are now visible.`);
    }
  };

  const handleToggleMute = () => {
    toggleMuteConversation(conversation.id);
    const nowMuted = !isMuted;
    if (nowMuted) {
      toast.flame('Notifications Muted', 'You will no longer receive alerts from this chat.');
    } else {
      toast.flame('Notifications Enabled', 'You will receive alerts for new messages.');
    }
  };

  const handleRequestConnection = async () => {
    if (!otherUserId) return;
    setIsRequestingConnection(true);
    try {
      await sendConnectionRequest(otherUserId);
      toast.flame('Connection Requested', 'Once accepted, messaging will unlock.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to request connection');
    } finally {
      setIsRequestingConnection(false);
    }
  };

  const toggleRevealBlockedMessage = (msgId: string) => {
    setRevealedBlockedMessageIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  // Helper to resolve sender profile info with fallback to people list or auth user
  const resolveSenderInfo = (senderId: string, rawSender?: Message['sender']) => {
    if (user && user.id === senderId) {
      return {
        id: user.id,
        displayName: user.profile?.displayName || 'You',
        username: user.username || 'you',
        avatarUrl: user.profile?.avatarUrl,
        avatarInitials: user.profile?.displayName?.slice(0, 2).toUpperCase() || 'ME',
        role: user.role || user.profile?.role,
        isVerified: user.isVerified || user.profile?.isVerified || user.username === 'sidhu001',
      };
    }
    const matchedPerson = people.find((p) => p.id === senderId);
    return {
      id: senderId,
      displayName: matchedPerson?.profile?.displayName || rawSender?.displayName || 'Builder',
      username: matchedPerson?.username || rawSender?.username || 'builder',
      avatarUrl: matchedPerson?.profile?.avatarUrl || rawSender?.avatarUrl,
      avatarInitials:
        matchedPerson?.profile?.displayName?.slice(0, 2).toUpperCase() ||
        rawSender?.avatarInitials ||
        '??',
      role: matchedPerson?.role || matchedPerson?.profile?.role,
      isVerified:
        matchedPerson?.isVerified ||
        matchedPerson?.profile?.isVerified ||
        matchedPerson?.username === 'sidhu001' ||
        rawSender?.username === 'sidhu001',
    };
  };

  // Group messages by sender if sent within 5 minutes
  const groupedMessages = React.useMemo(() => {
    const groups: {
      senderId: string;
      sender: ReturnType<typeof resolveSenderInfo>;
      messages: Message[];
      isBlocked: boolean;
    }[] = [];

    convMessages.forEach((msg) => {
      const msgBlocked = isUserBlocked(msg.senderId);
      const senderInfo = resolveSenderInfo(msg.senderId, msg.sender);
      const lastGroup = groups[groups.length - 1];
      const isSameSender = lastGroup && lastGroup.senderId === msg.senderId;

      if (isSameSender && lastGroup.messages.length > 0) {
        const lastMsgTime = new Date(
          lastGroup.messages[lastGroup.messages.length - 1].createdAt
        ).getTime();
        const curMsgTime = new Date(msg.createdAt).getTime();
        const diffMinutes = (curMsgTime - lastMsgTime) / (1000 * 60);

        if (diffMinutes <= 5) {
          lastGroup.messages.push(msg);
          return;
        }
      }

      groups.push({
        senderId: msg.senderId,
        sender: senderInfo,
        messages: [msg],
        isBlocked: msgBlocked,
      });
    });

    return groups;
  }, [convMessages, isUserBlocked, people, user]);

  const conversationTitle = conversation.type === 'direct'
    ? otherUser?.profile.displayName || 'Direct Chat'
    : conversation.title;

  return (
    <div className={cn('flex flex-col h-full min-h-0 bg-card rounded-2xl border border-border/80 text-left overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 border-b border-border/70 bg-card/90 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border/70 transition-colors md:hidden shrink-0 shadow-sm"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-flame-500" />
              <span className="font-bold">Chats</span>
            </button>
          )}

          {conversation.type === 'direct' && otherUser ? (
            <button
              type="button"
              onClick={() => onNavigateToUser?.(otherUser.id)}
              className="flex items-center gap-2.5 group focus-visible:outline-none min-w-0"
            >
              <Avatar
                src={otherUser.profile.avatarUrl}
                name={otherUser.profile.displayName}
                size="sm"
                showPresence
                isOnline
                className="shrink-0"
              />
              <div className="text-left truncate">
                <div className="flex items-center gap-1.5 truncate">
                  <h3 className="font-display font-bold text-sm text-foreground group-hover:underline truncate">
                    {otherUser.profile.displayName}
                  </h3>
                  <VerifiedBadge
                    role={otherUser.role || otherUser.profile?.role}
                    isVerified={otherUser.isVerified || otherUser.profile?.isVerified || otherUser.username === 'sidhu001'}
                    showRoleTag
                    size="sm"
                  />
                </div>
                <p className="font-mono text-[10px] text-muted-foreground truncate">@{otherUser.username}</p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-muted/60 border border-border flex items-center justify-center text-muted-foreground shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-foreground truncate">
                  {conversationTitle}
                </h3>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {conversation.participantIds.length} members
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {conversation.type === 'general' && (
            <Badge variant="outline" size="sm" className="font-mono text-[10px] hidden sm:inline-flex">
              Community Chat
            </Badge>
          )}

          {/* Conversation Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Conversation options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleToggleMute} className="gap-2 text-xs">
                {isMuted ? (
                  <>
                    <Bell className="h-3.5 w-3.5 text-flame-500" />
                    <span>Unmute Chat Alerts</span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Mute Chat Alerts</span>
                  </>
                )}
              </DropdownMenuItem>

              {pinnedMessage && (
                <DropdownMenuItem
                  onClick={() => scrollToMessage(pinnedMessage.id)}
                  className="gap-2 text-xs"
                >
                  <Pin className="h-3.5 w-3.5 text-flame-500" />
                  <span>Jump to Pinned Message</span>
                </DropdownMenuItem>
              )}

              {conversation.type === 'direct' && otherUser && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleToggleBlock(otherUser.id, otherUser.profile.displayName)}
                    className={cn(
                      'gap-2 text-xs',
                      isOtherUserBlocked ? 'text-foreground' : 'text-destructive focus:text-destructive'
                    )}
                  >
                    {isOtherUserBlocked ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5 text-success" />
                        <span>Unblock @{otherUser.username}</span>
                      </>
                    ) : (
                      <>
                        <UserX className="h-3.5 w-3.5 text-destructive" />
                        <span>Avoid / Block Messages</span>
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Pinned Message Announcement Banner */}
      {pinnedMessage && (
        <div className="px-3.5 sm:px-5 py-2 bg-flame-500/10 border-b border-flame-500/20 flex items-center justify-between gap-3 text-xs shrink-0 transition-colors hover:bg-flame-500/15">
          <button
            type="button"
            onClick={() => scrollToMessage(pinnedMessage.id)}
            className="flex items-center gap-2 text-left min-w-0 flex-1 focus-visible:outline-none"
          >
            <div className="h-5 w-5 rounded-md bg-flame-500/20 text-flame-500 flex items-center justify-center shrink-0">
              <Pin className="h-3 w-3" />
            </div>
            <div className="min-w-0 truncate">
              <span className="font-display font-semibold text-foreground mr-1.5">
                Pinned by {pinnedMessage.sender.displayName || 'Moderator'}:
              </span>
              <span className="text-muted-foreground truncate font-sans">
                {pinnedMessage.content || '[Image Attachment]'}
              </span>
            </div>
          </button>

          {(isModerator || pinnedMessage.senderId === user?.id) && (
            <button
              type="button"
              onClick={() => handleTogglePin(pinnedMessage.id)}
              className="font-mono text-[10px] text-muted-foreground hover:text-flame-500 hover:underline shrink-0 p-1"
              title="Unpin message"
            >
              <PinOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-4 overscroll-contain">
        {groupedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-12">
            <div className="h-10 w-10 rounded-2xl bg-muted/40 border border-border flex items-center justify-center text-muted-foreground">
              <Sparkles className="h-5 w-5 text-flame-500" />
            </div>
            <p className="font-display font-semibold text-sm text-foreground">
              Beginning of this conversation
            </p>
            <p className="font-mono text-xs text-muted-foreground max-w-xs">
              Say hello, ask what they're building, or spark an idea.
            </p>
          </div>
        ) : (
          groupedMessages.map((group, gIdx) => {
            const isOwn = group.senderId === user?.id;
            const isSenderBlocked = isUserBlocked(group.senderId);

            return (
              <div
                key={gIdx}
                className={cn('flex items-end gap-2.5 group/group', isOwn ? 'flex-row-reverse' : 'flex-row')}
              >
                {/* Avatar */}
                <button
                  type="button"
                  onClick={() => onNavigateToUser?.(group.sender.id)}
                  className={cn(
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-flame-500 rounded-full mb-1 shrink-0 hover:scale-105 transition-transform',
                    isOwn && 'hidden sm:block'
                  )}
                  title={`View profile of ${group.sender.displayName}`}
                >
                  <Avatar
                    src={group.sender.avatarUrl}
                    name={group.sender.displayName}
                    size="sm"
                    className="shrink-0 shadow-sm"
                  />
                </button>

                {/* Bubble Cluster */}
                <div className={cn('flex flex-col space-y-1.5 max-w-[85%] sm:max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
                  {/* Clean & Minimal Sender Header - Show ONLY Display Name, Clickable to Profile */}
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-1 mb-0.5',
                      isOwn ? 'flex-row-reverse justify-end' : 'flex-row justify-start'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onNavigateToUser?.(group.sender.id)}
                      className="font-display font-semibold text-xs text-foreground hover:underline hover:text-flame-500 transition-colors"
                    >
                      {isOwn ? 'You' : group.sender.displayName}
                    </button>
                    {isSenderBlocked && (
                      <span className="font-mono text-[9px] text-destructive bg-destructive/10 px-1.5 py-0.2 rounded">
                        Blocked
                      </span>
                    )}
                  </div>

                  {group.messages.map((msg) => {
                    const isEditing = editingMessageId === msg.id;
                    const isRevealed = revealedBlockedMessageIds.includes(msg.id);
                    const isEdited = msg.updatedAt && new Date(msg.updatedAt).getTime() - new Date(msg.createdAt).getTime() > 1000;
                    const isThisPinned = conversation.pinnedMessageId === msg.id || msg.isPinned;
                    const isHighlighted = highlightedMessageId === msg.id;

                    if (isSenderBlocked && !isRevealed && !isOwn) {
                      return (
                        <div
                          key={msg.id}
                          id={`chat-msg-${msg.id}`}
                          className="px-3.5 py-2 text-xs rounded-xl bg-muted/30 border border-border/50 text-muted-foreground flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2">
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono text-[11px]">Message hidden from blocked user</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleRevealBlockedMessage(msg.id)}
                            className="text-[11px] font-mono font-medium text-flame-500 hover:underline flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Reveal</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        id={`chat-msg-${msg.id}`}
                        className={cn(
                          'relative group/msg px-4 py-2.5 text-xs sm:text-sm leading-relaxed rounded-2xl break-words transition-all shadow-subtle',
                          isOwn
                            ? 'bg-foreground text-background rounded-br-sm'
                            : 'bg-muted/40 text-foreground border border-border/70 rounded-bl-sm',
                          isThisPinned && 'ring-1.5 ring-flame-500 bg-flame-500/5',
                          isHighlighted && 'ring-2 ring-flame-500 scale-[1.02] duration-300 animate-pulse',
                          isEditing && 'ring-2 ring-flame-500'
                        )}
                      >
                        {/* Pinned Tag if message is pinned */}
                        {isThisPinned && (
                          <div
                            className={cn(
                              'flex items-center gap-1 pb-1 mb-1 border-b text-[10px] font-mono font-semibold',
                              isOwn
                                ? 'border-background/20 text-flame-300'
                                : 'border-border/60 text-flame-500'
                            )}
                          >
                            <Pin className="h-3 w-3 fill-current" />
                            <span>Pinned Message</span>
                          </div>
                        )}

                        {msg.imageUrl && (
                          <div className="mb-2 max-h-64 overflow-hidden rounded-xl border border-border/30">
                            <img
                              src={msg.imageUrl}
                              alt="Chat attachment"
                              className="w-full max-h-64 object-contain rounded-xl bg-black/10 dark:bg-black/40"
                            />
                          </div>
                        )}

                        {isEditing ? (
                          <div className="space-y-2 min-w-[220px] sm:min-w-[300px] pt-1">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEdit();
                                } else if (e.key === 'Escape') {
                                  cancelEditing();
                                }
                              }}
                              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-flame-500"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="px-2.5 py-1 text-[11px] font-mono rounded bg-muted text-muted-foreground hover:text-foreground"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={isSavingEdit || !editContent.trim()}
                                className="px-2.5 py-1 text-[11px] font-mono font-medium rounded bg-flame-500 text-white hover:bg-flame-600 disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {msg.content && <p className="font-sans whitespace-pre-wrap">{msg.content}</p>}

                            {/* Timestamp, Edited Badge & Context Actions */}
                            <div
                              className={cn(
                                'flex items-center gap-1.5 pt-1 font-mono text-[9px]',
                                isOwn ? 'text-background/70 justify-end' : 'text-muted-foreground justify-start'
                              )}
                            >
                              <time>{format(new Date(msg.createdAt), 'h:mm a')}</time>
                              {isEdited && <span className="opacity-75 italic">(edited)</span>}

                              <div className="flex items-center gap-1 ml-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(msg.content, msg.id)}
                                  className="hover:scale-110 transition-transform p-0.5"
                                  title="Copy text"
                                  aria-label="Copy text"
                                >
                                  {copiedMessageId === msg.id ? (
                                    <Check className="h-3 w-3 text-success" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>

                                {/* Pin / Unpin message button */}
                                <button
                                  type="button"
                                  onClick={() => handleTogglePin(msg.id)}
                                  className="hover:scale-110 transition-transform p-0.5 hover:text-flame-500"
                                  title={isThisPinned ? 'Unpin message' : 'Pin message'}
                                  aria-label={isThisPinned ? 'Unpin message' : 'Pin message'}
                                >
                                  {isThisPinned ? (
                                    <PinOff className="h-3 w-3 text-flame-500" />
                                  ) : (
                                    <Pin className="h-3 w-3" />
                                  )}
                                </button>

                                {/* Edit button for own messages */}
                                {isOwn && (
                                  <button
                                    type="button"
                                    onClick={() => startEditing(msg)}
                                    className="hover:scale-110 transition-transform p-0.5 hover:text-flame-500"
                                    title="Edit message"
                                    aria-label="Edit message"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                )}

                                {/* Delete button for own messages or moderator */}
                                {(isOwn || isModerator) && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingMessage(msg)}
                                    className="hover:scale-110 transition-transform p-0.5 hover:text-destructive"
                                    title="Delete message"
                                    aria-label="Delete message"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}

                                {/* Block option on received message */}
                                {!isOwn && !isSenderBlocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBlock(msg.senderId, group.sender.displayName)}
                                    className="hover:scale-110 transition-transform p-0.5 hover:text-destructive"
                                    title={`Avoid messages from ${group.sender.displayName}`}
                                    aria-label={`Avoid messages from ${group.sender.displayName}`}
                                  >
                                    <UserX className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Gated Direct Messaging Prompt OR Fixed Composer */}
      <div className="p-3 sm:p-4 border-t border-border/70 bg-card shrink-0">
        {user?.moderationStatus && user.moderationStatus !== 'active' ? (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-3 text-left">
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-xs text-foreground">
                  Messaging Restricted by Admin
                </span>
                <Badge variant="warning" size="sm" className="font-mono text-[9px] uppercase">
                  {user.moderationStatus}
                </Badge>
              </div>
              <p className="font-sans text-xs text-muted-foreground">
                {user.moderationReason
                  ? `Note: ${user.moderationReason}`
                  : 'Your account messaging privileges are restricted by Admin.'}
              </p>
            </div>
          </div>
        ) : isDirectChatGated ? (
          <div className="p-4 rounded-xl border border-flame-500/30 bg-flame-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Lock className="h-3.5 w-3.5 text-flame-500" />
                <span>Connection Required for Direct Messaging</span>
              </div>
              <p className="text-xs text-muted-foreground">
                The Hub keeps conversations intentional. Connect with {otherUser?.profile.displayName} to start chatting.
              </p>
            </div>
            <Button
              variant="flame"
              size="sm"
              onClick={handleRequestConnection}
              disabled={isRequestingConnection}
              iconPrefix={<UserPlus className="h-3.5 w-3.5" />}
              className="shrink-0"
            >
              Send Connection Request
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Attached image preview */}
            {attachedImage && (
              <div className="relative inline-block rounded-xl border border-border bg-muted/40 p-1.5 group">
                <img
                  src={attachedImage}
                  alt="Attachment preview"
                  className="h-20 w-auto rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                  title="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file);
                  e.target.value = '';
                }}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-border bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                title="Attach image from your device"
                aria-label="Attach image from your device"
              >
                <ImageIcon className="h-4 w-4 text-flame-500" />
              </button>

              <input
                type="text"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${conversationTitle}... (Enter to send)`}
                className={cn(
                  'flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-xs sm:text-sm text-foreground',
                  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-flame-500/50 shadow-inner'
                )}
              />
              <Button
                type="submit"
                variant="flame"
                size="md"
                disabled={isSending || (!inputContent.trim() && !attachedImage)}
                className="h-10 px-4 shrink-0 font-mono text-xs"
                iconPrefix={<Send className="h-3.5 w-3.5" />}
              >
                Send
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Delete Message Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingMessage)}
        onClose={() => setDeletingMessage(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Message?"
        description="Are you sure you want to permanently delete this message? This cannot be undone."
        confirmText="Delete Message"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
