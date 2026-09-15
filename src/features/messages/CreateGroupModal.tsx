import * as React from 'react';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { useChatStore } from '@/stores/useChatStore';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Avatar,
} from '@/components/primitives';
import { Users, Check } from 'lucide-react';
import { toast } from '@/components/primitives/Toast';
import { cn } from '@/lib/utils';

export interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated?: (conversationId: string) => void;
}

export function CreateGroupModal({
  open,
  onOpenChange,
  onGroupCreated,
}: CreateGroupModalProps) {
  const { user: currentUser } = useAuthStore();
  const { people } = usePeopleStore();
  const { createGroupChat } = useChatStore();

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const eligibleMembers = people.filter((p) => p.id !== currentUser?.id);

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedUserIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const participantIds = [currentUser!.id, ...selectedUserIds];
      const conversation = await createGroupChat(
        title.trim(),
        participantIds,
        description.trim() || undefined
      );

      toast.flame('Group Created', `"${title}" conversation is ready.`);
      setTitle('');
      setDescription('');
      setSelectedUserIds([]);
      onOpenChange(false);
      onGroupCreated?.(conversation.id);
    } catch {
      toast.error('Failed to create group chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-flame-500" />
              <span>Create Group Conversation</span>
            </DialogTitle>
            <DialogDescription>
              Start a shared space to plan projects, jam on ideas, or have casual group discussions.
            </DialogDescription>
          </DialogHeader>

          <Input
            label="Group Name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. AI Study Circle, Frontend Hackers"
          />

          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will this group discuss?"
          />

          {/* Member Selection List */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Select Members ({selectedUserIds.length} selected)
            </label>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2 space-y-1.5">
              {eligibleMembers.map((member) => {
                const isSelected = selectedUserIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleSelectUser(member.id)}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-foreground text-background font-medium'
                        : 'hover:bg-muted/50 text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={member.profile.avatarUrl}
                        name={member.profile.displayName}
                        size="sm"
                        showPresence
                        isOnline
                      />
                      <div>
                        <p className="text-xs font-semibold">{member.profile.displayName}</p>
                        <p
                          className={cn(
                            'text-[10px] font-mono',
                            isSelected ? 'text-background/80' : 'text-muted-foreground'
                          )}
                        >
                          @{member.username}
                        </p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'h-5 w-5 rounded-md border flex items-center justify-center transition-colors',
                        isSelected
                          ? 'border-background bg-background text-foreground'
                          : 'border-border bg-card text-transparent'
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="flame"
              disabled={isSubmitting || !title.trim() || selectedUserIds.length === 0}
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
