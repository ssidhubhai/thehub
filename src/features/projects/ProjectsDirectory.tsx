import * as React from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectInterestModal } from './ProjectInterestModal';
import { Button, Skeleton, EmptyState } from '@/components/primitives';
import { Search, X, FolderGit2, Plus } from 'lucide-react';
import { Project } from '@/types/project';
import { cn } from '@/lib/utils';

export interface ProjectsDirectoryProps {
  onSelectProject: (projectId: string) => void;
}

export function ProjectsDirectory({ onSelectProject }: ProjectsDirectoryProps) {
  const {
    projects,
    fetchProjects,
    searchQuery,
    setSearchQuery,
    selectedRoleTags,
    toggleRoleTag,
    isLoading,
  } = useProjectStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [interestTargetProject, setInterestTargetProject] = React.useState<Project | null>(null);

  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Extract all unique looking-for tags
  const popularRoleTags = React.useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      (p.lookingForTags || []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [projects]);

  // Filter projects by search and role tags
  const filteredProjects = React.useMemo(() => {
    return projects.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const lookingFor = p.lookingForTags || [];
      const matchesSearch =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.tagline || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        lookingFor.some((t) => t.toLowerCase().includes(q));

      const matchesRoles =
        selectedRoleTags.length === 0 ||
        selectedRoleTags.every((role) => lookingFor.includes(role));

      return matchesSearch && matchesRoles;
    });
  }, [projects, searchQuery, selectedRoleTags]);

  return (
    <div className="space-y-8 text-left max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-flame-500" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Directory
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground font-sans">
            See what people are building. Join a team, pitch in, or launch your own vision.
          </p>
        </div>

        <Button
          variant="flame"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          iconPrefix={<Plus className="h-4 w-4" />}
          className="self-start sm:self-auto shrink-0"
        >
          Start a Project
        </Button>
      </div>

      {/* Controls: Search & Role Filters (F57) */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title, keywords, or skills needed..."
            className={cn(
              'w-full rounded-xl border border-border bg-card pl-10 pr-10 py-2.5 text-sm text-foreground',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-flame-500/50 shadow-subtle'
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Role Tags Filter Chips */}
        {popularRoleTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="font-mono text-xs text-muted-foreground mr-1">Open Roles:</span>
            {popularRoleTags.map((tag) => {
              const isSelected = selectedRoleTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleRoleTag(tag)}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-mono transition-all border',
                    isSelected
                      ? 'bg-foreground text-background border-foreground font-semibold'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted'
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Projects Grid (F56) */}
      {isLoading && projects.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title="No projects match your criteria"
          description="Try clearing your search or start the first project in this category!"
          icon={<FolderGit2 className="h-8 w-8 text-muted-foreground" />}
          actionLabel="Start a Project"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelect={onSelectProject}
              onExpressInterest={() => setInterestTargetProject(project)}
            />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onProjectCreated={onSelectProject}
      />

      {/* Project Interest Modal */}
      <ProjectInterestModal
        project={interestTargetProject}
        open={Boolean(interestTargetProject)}
        onOpenChange={(open) => !open && setInterestTargetProject(null)}
      />
    </div>
  );
}
