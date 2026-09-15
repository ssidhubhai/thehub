import * as React from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
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
  Badge,
  toast,
} from '@/components/primitives';
import { Plus, X, Edit3 } from 'lucide-react';
import { Project, ProjectExternalLink } from '@/types/project';
import { ImageUploader } from '@/components/shared/ImageUploader';

export interface EditProjectModalProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated?: () => void;
}

export function EditProjectModal({
  project,
  open,
  onOpenChange,
  onProjectUpdated,
}: EditProjectModalProps) {
  const { updateProject } = useProjectStore();

  const [name, setName] = React.useState(project.name);
  const [tagline, setTagline] = React.useState(project.tagline);
  const [description, setDescription] = React.useState(project.description || '');
  const [coverImageUrl, setCoverImageUrl] = React.useState(project.coverImageUrl || '');
  const [lookingForTags, setLookingForTags] = React.useState<string[]>(
    project.lookingForTags || []
  );
  const [tagInput, setTagInput] = React.useState('');

  const initialGithub =
    project.links?.find((l) => l.type === 'github')?.url || '';
  const initialDemo =
    project.links?.find((l) => l.type === 'demo' || l.type === 'website')?.url || '';

  const [githubUrl, setGithubUrl] = React.useState(initialGithub);
  const [demoUrl, setDemoUrl] = React.useState(initialDemo);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(project.name);
      setTagline(project.tagline);
      setDescription(project.description || '');
      setCoverImageUrl(project.coverImageUrl || '');
      setLookingForTags(project.lookingForTags || []);
      setGithubUrl(project.links?.find((l) => l.type === 'github')?.url || '');
      setDemoUrl(
        project.links?.find((l) => l.type === 'demo' || l.type === 'website')?.url || ''
      );
    }
  }, [open, project]);

  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let tag = tagInput.trim().toLowerCase();
    if (!tag.startsWith('#')) tag = `#${tag}`;
    if (tag.length > 1 && !lookingForTags.includes(tag)) {
      setLookingForTags([...lookingForTags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setLookingForTags(lookingForTags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tagline.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const links: ProjectExternalLink[] = [];
      if (githubUrl.trim()) {
        links.push({ type: 'github', label: 'GitHub Repository', url: githubUrl.trim() });
      }
      if (demoUrl.trim()) {
        links.push({ type: 'demo', label: 'Live Demo', url: demoUrl.trim() });
      }

      await updateProject(project.id, {
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        lookingForTags,
        links,
        coverImageUrl: coverImageUrl.trim() || undefined,
      });

      toast.flame('Project Updated', 'Your project changes have been saved successfully.');
      onOpenChange(false);
      onProjectUpdated?.();
    } catch {
      toast.error('Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-flame-500" />
              <span>Edit Project Details</span>
            </DialogTitle>
            <DialogDescription>
              Update your project description, roles sought, and external preview links.
            </DialogDescription>
          </DialogHeader>

          <Input
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Hypatia AI, SonicBloom"
          />

          <Input
            label="Tagline (What are you building?)"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            required
            placeholder="One sentence describing what this project accomplishes..."
          />

          <Textarea
            label="Detailed Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Describe the problem, your approach, current progress, and vision..."
          />

          {/* Looking for Tags */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Roles & Skills Looking For
            </label>
            <div className="flex flex-wrap gap-1.5 min-h-8 p-2 rounded-lg border border-border/60 bg-muted/20">
              {lookingForTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  size="sm"
                  className="gap-1 pr-1 font-mono text-xs"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="rounded-full hover:bg-muted p-0.5"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {lookingForTags.length === 0 && (
                <span className="text-xs text-muted-foreground self-center">
                  No roles specified.
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add role tag (e.g. #rust, #ml, #design)..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-flame-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                iconPrefix={<Plus className="h-3.5 w-3.5" />}
                className="text-xs"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Links & Media */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Input
              label="GitHub URL"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/..."
            />
            <Input
              label="Live Demo URL"
              type="url"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://myproject.app"
            />
          </div>

          <div className="pt-1">
            <ImageUploader
              value={coverImageUrl}
              onChange={(url) => setCoverImageUrl(url)}
              label="Cover Image (Device or URL, Optional)"
            />
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
              disabled={isSubmitting || !name.trim() || !tagline.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
