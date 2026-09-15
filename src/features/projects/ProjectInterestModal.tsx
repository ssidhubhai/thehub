import * as React from 'react';
import { Project } from '@/types/project';
import { useProjectStore } from '@/stores/useProjectStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Textarea,
} from '@/components/primitives';
import { Sparkles, Send } from 'lucide-react';
import { toast } from '@/components/primitives/Toast';

export interface ProjectInterestModalProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectInterestModal({
  project,
  open,
  onOpenChange,
}: ProjectInterestModalProps) {
  const { expressInterest } = useProjectStore();
  const [pitch, setPitch] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await expressInterest(project.id, pitch.trim() || undefined);
      toast.flame(
        'Interest Sent',
        `The creator of ${project.name} has been notified. They will reach out to collaborate!`
      );
      setPitch('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send interest note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-flame-500" />
              <span>Express Interest in {project.name}</span>
            </DialogTitle>
            <DialogDescription>
              Let the project owner know why you'd like to collaborate, what skills you bring, or what questions you have.
            </DialogDescription>
          </DialogHeader>

          {project.lookingForTags.length > 0 && (
            <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1.5">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                Open Contributor Roles:
              </span>
              <div className="flex flex-wrap gap-1">
                {project.lookingForTags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[11px] bg-flame-500/10 text-flame-700 dark:text-flame-400 border border-flame-500/20 px-2 py-0.5 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Textarea
            label="Note or Pitch (Optional)"
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            rows={4}
            placeholder="Introduce yourself, share your relevant skills or projects, and describe how you'd like to contribute..."
            autoFocus
          />

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
              disabled={isSubmitting}
              iconPrefix={<Send className="h-3.5 w-3.5" />}
            >
              {isSubmitting ? 'Sending...' : 'Send Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
