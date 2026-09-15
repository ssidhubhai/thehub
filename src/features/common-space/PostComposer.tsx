import * as React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { Avatar, Button, Textarea, ConfirmModal } from '@/components/primitives';
import { Image, Link2, X, Flame, Pin } from 'lucide-react';
import { PostAttachment } from '@/types/post';
import { toast } from '@/components/primitives/Toast';
import { cn } from '@/lib/utils';
import { ImageUploader } from '@/components/shared/ImageUploader';

export interface PostComposerProps {
  onPostCreated?: () => void;
  className?: string;
}

export function PostComposer({ onPostCreated, className }: PostComposerProps) {
  const { user } = useAuthStore();
  const { createPost, isPosting } = useFeedStore();

  const isMod =
    user?.role === 'moderator' ||
    user?.role === 'admin' ||
    user?.profile?.role === 'moderator' ||
    user?.username === 'sidhu001';

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [content, setContent] = React.useState('');
  const [isPinned, setIsPinned] = React.useState(false);
  const [attachmentType, setAttachmentType] = React.useState<'none' | 'image' | 'link'>('none');
  const [imageUrl, setImageUrl] = React.useState('');
  const [linkUrl, setLinkUrl] = React.useState('');
  const [linkTitle, setLinkTitle] = React.useState('');
  const [isDiscardModalOpen, setIsDiscardModalOpen] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  if (!user) return null;

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const executeDiscard = () => {
    setContent('');
    setIsPinned(false);
    setAttachmentType('none');
    setImageUrl('');
    setLinkUrl('');
    setLinkTitle('');
    setIsExpanded(false);
    setIsDiscardModalOpen(false);
  };

  const handleCollapse = () => {
    if (content.trim()) {
      setIsDiscardModalOpen(true);
      return;
    }
    executeDiscard();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || isPosting) return;

    let attachment: PostAttachment | undefined = undefined;
    if (attachmentType === 'image' && imageUrl.trim()) {
      attachment = {
        type: 'image',
        url: imageUrl.trim(),
      };
    } else if (attachmentType === 'link' && linkUrl.trim()) {
      attachment = {
        type: 'link',
        url: linkUrl.trim(),
        previewTitle: linkTitle.trim() || linkUrl.trim(),
      };
    }

    try {
      await createPost(content, attachment, isPinned);
      setContent('');
      setIsPinned(false);
      setAttachmentType('none');
      setImageUrl('');
      setLinkUrl('');
      setLinkTitle('');
      setIsExpanded(false);
      toast.flame('Shared to Common Space', 'Your post is now visible to all community builders.');
      onPostCreated?.();
    } catch {
      toast.error('Failed to publish post');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-subtle transition-all duration-200 text-left',
        isExpanded && 'border-border shadow-md ring-1 ring-border/50',
        className
      )}
    >
      {!isExpanded ? (
        // Collapsed View (F30)
        <div
          onClick={handleExpand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleExpand()}
          className="flex items-center gap-3 cursor-pointer group"
          aria-label="Open post composer"
        >
          <Avatar
            src={user.profile.avatarUrl}
            name={user.profile.displayName}
            size="sm"
            showPresence
            isOnline
          />
          <div className="flex-1 rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-xs sm:text-sm text-muted-foreground group-hover:bg-muted/50 group-hover:text-foreground transition-colors">
            What's on your mind, {user.profile.displayName}?
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex text-xs font-mono"
            tabIndex={-1}
          >
            Post
          </Button>
        </div>
      ) : (
        // Expanded View (F31)
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-3">
            <Avatar
              src={user.profile.avatarUrl}
              name={user.profile.displayName}
              size="sm"
              showPresence
              isOnline
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share a breakthrough, question, discovery, or project update..."
                rows={3}
                className="w-full text-sm font-sans border-none p-0 focus-visible:ring-0 shadow-none resize-none bg-transparent"
              />

              {/* Attachment Preview / Inputs (F32) */}
              {attachmentType === 'image' && (
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-muted-foreground flex items-center gap-1.5 font-bold">
                      <Image className="h-3.5 w-3.5 text-flame-500" />
                      Attach Image (Local File or URL)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentType('none');
                        setImageUrl('');
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ImageUploader
                    value={imageUrl}
                    onChange={(dataUrl) => setImageUrl(dataUrl)}
                    label="Choose from Device or Web"
                  />
                </div>
              )}

              {attachmentType === 'link' && (
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-flame-500" />
                      Attach Link
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentType('none');
                        setLinkUrl('');
                        setLinkTitle('');
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com/demo"
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-flame-500"
                    />
                    <input
                      type="text"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="Optional link title / label"
                      className="w-full rounded-lg border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-flame-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={attachmentType === 'image' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() =>
                  setAttachmentType(attachmentType === 'image' ? 'none' : 'image')
                }
                iconPrefix={<Image className="h-4 w-4" />}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
                title="Attach Image"
              >
                <span className="hidden sm:inline ml-1">Image</span>
              </Button>

              <Button
                type="button"
                variant={attachmentType === 'link' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() =>
                  setAttachmentType(attachmentType === 'link' ? 'none' : 'link')
                }
                iconPrefix={<Link2 className="h-4 w-4" />}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
                title="Attach Link"
              >
                <span className="hidden sm:inline ml-1">Link</span>
              </Button>

              {isMod && (
                <Button
                  type="button"
                  variant={isPinned ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setIsPinned(!isPinned)}
                  iconPrefix={<Pin className={cn('h-3.5 w-3.5', isPinned && 'fill-current text-sky-500')} />}
                  className={cn(
                    'text-xs h-8 px-2.5 transition-colors',
                    isPinned
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Pin as Lead Announcement"
                >
                  <span className="hidden sm:inline ml-1 font-mono text-[11px] font-semibold">
                    {isPinned ? 'Pinned Lead Post' : 'Pin to Top'}
                  </span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden md:inline font-mono text-[10px] text-muted-foreground/60 mr-1">
                Cmd+Enter to post
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCollapse}
                disabled={isPosting}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="flame"
                size="sm"
                disabled={isPosting || !content.trim()}
                iconPrefix={<Flame className="h-3.5 w-3.5 fill-current" />}
                className="text-xs font-semibold h-8"
              >
                {isPosting ? 'Publishing...' : 'Share'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Discard Draft Confirmation Modal */}
      <ConfirmModal
        isOpen={isDiscardModalOpen}
        onClose={() => setIsDiscardModalOpen(false)}
        onConfirm={executeDiscard}
        title="Discard Draft?"
        description="Are you sure you want to discard your draft post? Your written content and attachments will be cleared."
        confirmText="Discard Draft"
        cancelText="Keep Editing"
        variant="danger"
      />
    </div>
  );
}
