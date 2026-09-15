import * as React from 'react';
import { Post } from '@/types/post';
import { Avatar, Button, Textarea, ConfirmModal } from '@/components/primitives';
import { VerifiedBadge } from '@/components/primitives/VerifiedBadge';
import { ReactionButton } from './ReactionButton';
import {
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Send,
  Sparkles,
  Pin,
  PinOff,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/primitives/DropdownMenu';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { toast } from '@/components/primitives/Toast';

export interface PostCardProps {
  post: Post;
  onNavigateToUser?: (userId: string) => void;
  defaultExpandedReplies?: boolean;
  className?: string;
}

export function PostCard({
  post,
  onNavigateToUser,
  defaultExpandedReplies = false,
  className,
}: PostCardProps) {
  const { user } = useAuthStore();
  const {
    comments,
    fetchComments,
    toggleReaction,
    hasReacted,
    addComment,
    editPost,
    deletePost,
    togglePinPost,
    deleteComment,
  } = useFeedStore();

  const [isRepliesExpanded, setIsRepliesExpanded] = React.useState(defaultExpandedReplies);
  const [isContentExpanded, setIsContentExpanded] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [isSubmittingReply, setIsSubmittingReply] = React.useState(false);

  // Edit post state
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(post.content);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  // Delete post & comment modal states
  const [isDeletePostModalOpen, setIsDeletePostModalOpen] = React.useState(false);
  const [isDeletingPost, setIsDeletingPost] = React.useState(false);

  const [deletingCommentId, setDeletingCommentId] = React.useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = React.useState(false);

  const isAuthor = user?.id === post.authorId;
  const isMod =
    user?.role === 'moderator' ||
    user?.role === 'admin' ||
    user?.profile?.role === 'moderator' ||
    user?.username === 'sidhu001';
  const postComments = comments[post.id] || [];
  const userHasReacted = hasReacted(post.id);

  // Time format
  const formattedTime = React.useMemo(() => {
    try {
      return formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
    } catch {
      return 'recently';
    }
  }, [post.createdAt]);

  const handleToggleReplies = async () => {
    const next = !isRepliesExpanded;
    setIsRepliesExpanded(next);
    if (next && postComments.length === 0) {
      await fetchComments(post.id);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setIsSavingEdit(true);
    try {
      await editPost(post.id, editContent);
      setIsEditing(false);
      toast.flame('Post Updated', 'Your changes have been saved.');
    } catch {
      toast.error('Failed to update post');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDeletePost = async () => {
    setIsDeletingPost(true);
    try {
      await deletePost(post.id);
      setIsDeletePostModalOpen(false);
      toast.flame('Post Deleted', 'Your post was successfully removed.');
    } catch {
      toast.error('Failed to delete post');
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePinPost(post.id);
      toast.flame(
        post.isPinned ? 'Post Unpinned' : 'Post Pinned',
        post.isPinned ? 'The post has been unpinned.' : 'The post is now pinned to the top of the feed.'
      );
    } catch {
      toast.error('Failed to pin post');
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!deletingCommentId) return;
    setIsDeletingComment(true);
    try {
      await deleteComment(post.id, deletingCommentId);
      setDeletingCommentId(null);
      toast.flame('Reply Removed', 'The reply was successfully removed.');
    } catch {
      toast.error('Failed to remove reply');
    } finally {
      setIsDeletingComment(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !user) return;
    setIsSubmittingReply(true);
    try {
      await addComment(post.id, replyText);
      setReplyText('');
      if (!isRepliesExpanded) setIsRepliesExpanded(true);
      toast.flame('Reply Added', 'Your comment was posted to the thread.');
    } catch {
      toast.error('Failed to add reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Render text content with clickable @mentions
  const renderFormattedContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToUser?.(username);
            }}
            className="font-semibold text-flame-600 dark:text-flame-400 hover:underline inline-block"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <article
      id={`post-${post.id}`}
      data-testid={`post-${post.id}`}
      className={cn(
        'group rounded-2xl border bg-card p-5 sm:p-6 transition-all duration-200',
        post.isPinned
          ? 'border-sky-500/30 bg-sky-500/[0.02] dark:border-sky-500/30 dark:bg-sky-950/[0.1] shadow-sm'
          : 'border-border/80 hover:border-border hover:shadow-subtle',
        'text-left space-y-4',
        className
      )}
    >
      {/* Pinned announcement banner */}
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-sky-600 dark:text-sky-400 pb-2 border-b border-border/50">
          <Pin className="h-3.5 w-3.5 fill-current rotate-45 shrink-0" />
          <span>Pinned by Community Lead</span>
        </div>
      )}

      {/* Header: Author + Timestamp + Context Menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateToUser?.(post.author.id)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame-500 rounded-full"
          >
            <Avatar
              src={post.author.avatarUrl}
              name={post.author.displayName}
              size="md"
              showPresence
              isOnline
            />
          </button>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onNavigateToUser?.(post.author.id)}
                className="font-display font-bold text-sm text-foreground hover:underline text-left inline-flex items-center gap-1"
              >
                <span>{post.author.displayName}</span>
              </button>
              <VerifiedBadge
                role={post.author.role}
                isVerified={post.author.isVerified || post.author.username === 'sidhu001'}
                showRoleTag
                size="sm"
              />
              <span className="font-mono text-xs text-muted-foreground">
                @{post.author.username}
              </span>
              {post.isEdited && (
                <span className="font-mono text-[10px] text-muted-foreground/80 tracking-tight">
                  (edited)
                </span>
              )}
            </div>
            <time
              dateTime={post.createdAt}
              className="font-mono text-[11px] text-muted-foreground block mt-0.5"
            >
              {formattedTime}
            </time>
          </div>
        </div>

        {/* Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
              aria-label="Post options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Moderator pin action */}
            {isMod && (
              <>
                <DropdownMenuItem
                  onClick={handleTogglePin}
                  className="gap-2 text-xs font-medium cursor-pointer text-sky-600 dark:text-sky-400"
                >
                  {post.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  <span>{post.isPinned ? 'Unpin Post' : 'Pin to Top'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {isAuthor ? (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setIsEditing(true);
                    setEditContent(post.content);
                  }}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Post</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeletePostModalOpen(true)}
                  className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Post</span>
                </DropdownMenuItem>
              </>
            ) : isMod ? (
              <>
                <DropdownMenuItem
                  onClick={() => setIsDeletePostModalOpen(true)}
                  className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete as Moderator</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.flame('Link Copied', 'Post link copied to clipboard.');
                  }}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Copy Link</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.flame('Link Copied', 'Post link copied to clipboard.');
                }}
                className="gap-2 text-xs cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Copy Link</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Post Content or Edit Form */}
      {isEditing ? (
        <div className="space-y-3 pt-1">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="w-full text-sm font-sans"
            placeholder="Edit your post..."
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button
              variant="flame"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editContent.trim()}
            >
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {post.content.length > 280 || (post.content.match(/\n/g) || []).length > 4 ? (
            <div>
              <div
                className={cn(
                  'text-sm text-foreground/90 leading-relaxed font-sans whitespace-pre-wrap break-words transition-all duration-300 relative',
                  !isContentExpanded && 'max-h-32 overflow-hidden'
                )}
              >
                {renderFormattedContent(post.content)}
                {!isContentExpanded && (
                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsContentExpanded(!isContentExpanded)}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-flame-600 dark:text-flame-400 hover:text-flame-700 dark:hover:text-flame-300 transition-colors focus:outline-none focus-visible:underline"
              >
                <span>{isContentExpanded ? 'Show less' : 'Read more...'}</span>
                {isContentExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : (
            <div className="text-sm text-foreground/90 leading-relaxed font-sans whitespace-pre-wrap break-words">
              {renderFormattedContent(post.content)}
            </div>
          )}
        </div>
      )}

      {/* Attachments */}
      {post.attachment && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-muted/20">
          {post.attachment.type === 'image' && (
            <img
              src={post.attachment.url}
              alt="Post attachment"
              className="max-h-96 w-full object-cover rounded-xl"
              loading="lazy"
            />
          )}
          {post.attachment.type === 'link' && (
            <a
              href={post.attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors group/link"
            >
              <div className="space-y-0.5 truncate pr-2">
                <p className="text-xs font-semibold text-foreground group-hover/link:underline truncate">
                  {post.attachment.previewTitle || post.attachment.url}
                </p>
                {post.attachment.previewDescription && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {post.attachment.previewDescription}
                  </p>
                )}
                <span className="font-mono text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  <ExternalLink className="h-2.5 w-2.5" />
                  {post.attachment.url}
                </span>
              </div>
            </a>
          )}
        </div>
      )}

      {/* Card Actions: 🔥 Reaction Toggle & Reply Counter */}
      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
        <ReactionButton
          hasReacted={userHasReacted}
          count={post.reactionCount}
          onToggle={() => toggleReaction(post.id)}
        />

        <button
          type="button"
          onClick={handleToggleReplies}
          aria-expanded={isRepliesExpanded}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs transition-colors border',
            isRepliesExpanded
              ? 'bg-muted text-foreground border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>
            {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
          </span>
        </button>
      </div>

      {/* 1-Level Reply Thread Accordion */}
      {isRepliesExpanded && (
        <div className="pt-3 border-t border-border/40 space-y-4">
          {/* Reply List */}
          {postComments.length > 0 ? (
            <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-border/60">
              {postComments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2.5 text-left group/reply">
                  <Avatar
                    src={comment.author.avatarUrl}
                    name={comment.author.displayName}
                    size="xs"
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0 bg-muted/30 rounded-xl p-2.5 border border-border/50 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-display font-semibold text-xs text-foreground truncate">
                          {comment.author.displayName}
                        </span>
                        <VerifiedBadge
                          role={comment.author.role}
                          isVerified={comment.author.isVerified || comment.author.username === 'sidhu001'}
                          size="sm"
                        />
                        <span className="font-mono text-[10px] text-muted-foreground truncate">
                          @{comment.author.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <time className="font-mono text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </time>
                        {(comment.authorId === user?.id || isMod) && (
                          <button
                            type="button"
                            onClick={() => setDeletingCommentId(comment.id)}
                            title={comment.authorId === user?.id ? 'Delete reply' : 'Delete reply (Moderator)'}
                            className="opacity-0 group-hover/reply:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-foreground/90 font-sans whitespace-pre-wrap break-words">
                      {renderFormattedContent(comment.content)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-xs text-muted-foreground text-center py-2">
              No replies yet. Start the conversation below.
            </p>
          )}

          {/* Inline Reply Composer */}
          {user && (
            <form onSubmit={handleSubmitReply} className="flex items-center gap-2 pt-1">
              <Avatar
                src={user.profile.avatarUrl}
                name={user.profile.displayName}
                size="xs"
                className="shrink-0"
              />
              <div className="relative flex-1">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a thoughtful reply (use @name to mention)..."
                  className={cn(
                    'w-full rounded-full border border-border bg-background px-3.5 py-1.5 pr-10 text-xs font-sans text-foreground',
                    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-flame-500/50'
                  )}
                />
                <button
                  type="submit"
                  disabled={isSubmittingReply || !replyText.trim()}
                  className={cn(
                    'absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center',
                    'text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                  aria-label="Send reply"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Delete Post Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeletePostModalOpen}
        onClose={() => setIsDeletePostModalOpen(false)}
        onConfirm={handleConfirmDeletePost}
        title="Delete Post?"
        description="Are you sure you want to delete this post? This action will remove the post and all its replies permanently."
        confirmText="Delete Post"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingPost}
      />

      {/* Delete Comment Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingCommentId)}
        onClose={() => setDeletingCommentId(null)}
        onConfirm={handleConfirmDeleteComment}
        title="Delete Reply?"
        description="Are you sure you want to remove this reply? This cannot be undone."
        confirmText="Remove Reply"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingComment}
      />
    </article>
  );
}
