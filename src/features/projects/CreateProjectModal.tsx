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
import { Plus, X, FolderGit2 } from 'lucide-react';
import { ProjectExternalLink } from '@/types/project';
import { ImageUploader } from '@/components/shared/ImageUploader';

export interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (projectId: string) => void;
}

export function CreateProjectModal({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectModalProps) {
  const { createProject } = useProjectStore();

  const [name, setName] = React.useState('');
  const [tagline, setTagline] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [coverImageUrl, setCoverImageUrl] = React.useState('');
  const [lookingForTags, setLookingForTags] = React.useState<string[]>([
    '#frontend',
    '#ui-ux',
  ]);
  const [tagInput, setTagInput] = React.useState('');

  // External Links
  const [githubUrl, setGithubUrl] = React.useState('');
  const [demoUrl, setDemoUrl] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

      const created = await createProject({
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        lookingForTags,
        links,
        coverImageUrl: coverImageUrl.trim() || undefined,
      });

      toast.flame('Project Created', `${created.name} is now live in the community showcase.`);
      setName('');
      setTagline('');
      setDescription('');
      setCoverImageUrl('');
      setGithubUrl('');
      setDemoUrl('');
      onOpenChange(false);
      onProjectCreated?.(created.id);
    } catch {
      toast.error('Failed to create project');
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
              <FolderGit2 className="h-5 w-5 text-flame-500" />
              <span>Start a Project</span>
            </DialogTitle>
            <DialogDescription>
              Show what you're building, recruit fellow builders, and gather early community feedback.
            </DialogDescription>
          </DialogHeader>

          <Input
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Hypatia AI, SonicBloom, NeuroSync"
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
            placeholder="Describe the problem, your approach, current progress, and future vision..."
          />

          {/* Looking For Roles / Skills (F63) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              What collaborators are you looking for?
            </label>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl border border-border bg-muted/20">
              {lookingForTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  size="sm"
                  className="gap-1 font-mono text-[11px] py-0.5"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
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
              {isSubmitting ? 'Creating...' : 'Launch Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
