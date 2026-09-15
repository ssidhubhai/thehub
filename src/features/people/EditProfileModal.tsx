import * as React from 'react';
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
  Textarea,
  Avatar,
  Badge,
} from '@/components/primitives';
import { toast } from '@/components/primitives/Toast';
import { X, Plus, Sparkles } from 'lucide-react';
import { ImageUploader } from '@/components/shared/ImageUploader';

export interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const { user, updateProfile, isLoading } = useAuthStore();

  const [displayName, setDisplayName] = React.useState(user?.profile.displayName || '');
  const [bio, setBio] = React.useState(user?.profile.bio || '');
  const [avatarUrl, setAvatarUrl] = React.useState(user?.profile.avatarUrl || '');
  const [currentlyLearning, setCurrentlyLearning] = React.useState(
    user?.profile.currentlyLearning || ''
  );
  const [currentlyBuilding, setCurrentlyBuilding] = React.useState(
    user?.profile.currentlyBuilding || ''
  );
  const [interests, setInterests] = React.useState<string[]>(user?.profile.interests || []);
  const [newTagInput, setNewTagInput] = React.useState('');

  React.useEffect(() => {
    if (user) {
      setDisplayName(user.profile.displayName);
      setBio(user.profile.bio);
      setAvatarUrl(user.profile.avatarUrl || '');
      setCurrentlyLearning(user.profile.currentlyLearning || '');
      setCurrentlyBuilding(user.profile.currentlyBuilding || '');
      setInterests(user.profile.interests || []);
    }
  }, [user]);

  const handleAddInterest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tag = newTagInput.trim().toLowerCase().replace(/^#/, '');
    if (tag && !interests.includes(tag)) {
      setInterests([...interests, tag]);
      setNewTagInput('');
    }
  };

  const handleRemoveInterest = (tag: string) => {
    setInterests(interests.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        currentlyLearning: currentlyLearning.trim(),
        currentlyBuilding: currentlyBuilding.trim(),
        interests,
      });
      toast.flame('Profile Updated', 'Your profile details have been successfully saved.');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update profile');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-flame-500" />
              <span>Edit Profile</span>
            </DialogTitle>
            <DialogDescription>
              Keep your community identity, learning goals, and building projects up to date.
            </DialogDescription>
          </DialogHeader>

          {/* Avatar Preview & Upload from Device */}
          <div className="space-y-2 py-2">
            <div className="flex items-center gap-4">
              <Avatar
                src={avatarUrl}
                name={displayName || 'Builder'}
                size="xl"
                showPresence
                isOnline
              />
              <div className="flex-1">
                <ImageUploader
                  value={avatarUrl}
                  onChange={(url) => setAvatarUrl(url)}
                  label="Profile Picture (Device or URL)"
                />
              </div>
            </div>
          </div>

          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="Your Name"
          />

          <Textarea
            label="Short Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="What drives you? What are you curious about?"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Currently Learning"
              value={currentlyLearning}
              onChange={(e) => setCurrentlyLearning(e.target.value)}
              placeholder="e.g. Rust, Distributed Systems"
            />
            <Input
              label="Currently Building"
              value={currentlyBuilding}
              onChange={(e) => setCurrentlyBuilding(e.target.value)}
              placeholder="e.g. P2P File Sharing App"
            />
          </div>

          {/* Interests & Tags */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Interests & Topics</label>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl border border-border bg-muted/20">
              {interests.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  size="sm"
                  className="gap-1 font-mono text-[11px] py-0.5"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(tag)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {interests.length === 0 && (
                <span className="text-xs text-muted-foreground font-mono">No interests added yet</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                placeholder="Add an interest (e.g. ai, robotics)..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-flame-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddInterest}
                iconPrefix={<Plus className="h-3.5 w-3.5" />}
                className="text-xs"
              >
                Add
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="flame"
              disabled={isLoading || !displayName.trim()}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
