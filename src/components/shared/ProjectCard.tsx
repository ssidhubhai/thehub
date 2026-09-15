import * as React from 'react';
import { Project } from '@/types/project';
import { Avatar, Badge, Button } from '@/components/primitives';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  CheckCircle2,
  FolderGit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProjectCardProps {
  project: Project;
  onSelect?: (projectId: string) => void;
  onExpressInterest?: (projectId: string) => void;
  className?: string;
}

export function ProjectCard({
  project,
  onSelect,
  onExpressInterest,
  className,
}: ProjectCardProps) {
  const { people } = usePeopleStore();
  const { userInterests } = useProjectStore();
  const { user } = useAuthStore();

  const isApplied = userInterests[project.id];
  const isOwner = user?.id === project.ownerId;
  const isMember = project.team.some((m) => m.userId === user?.id);

  // Look up team members' user profiles
  const teamMembers = React.useMemo(() => {
    return project.team
      .map((member) => people.find((p) => p.id === member.userId))
      .filter(Boolean);
  }, [project.team, people]);

  return (
    <div
      onClick={() => onSelect?.(project.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(project.id)}
      className={cn(
        'group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card text-left transition-all duration-200',
        'hover:border-border hover:shadow-subtle cursor-pointer',
        className
      )}
    >
      {/* Cover Image or Gradient Banner */}
      <div className="relative h-32 w-full overflow-hidden bg-muted/40 border-b border-border/60">
        {project.coverImageUrl ? (
          <img
            src={project.coverImageUrl}
            alt={project.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted/60 via-card to-background flex items-center justify-center">
            <FolderGit2 className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Status Pills on Banner */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isApplied && (
            <Badge variant="success" size="sm" className="font-mono text-[10px] gap-1 shadow-sm">
              <CheckCircle2 className="h-3 w-3" />
              Interested
            </Badge>
          )}
          {isOwner && (
            <Badge variant="outline" size="sm" className="font-mono text-[10px] bg-background/80 backdrop-blur-sm">
              Your Project
            </Badge>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div>
            <h3 className="font-display font-bold text-lg text-foreground group-hover:underline line-clamp-1">
              {project.name}
            </h3>
            <p className="text-xs text-muted-foreground font-sans line-clamp-2 leading-relaxed mt-1">
              {project.tagline || project.description}
            </p>
          </div>

          {/* Looking For Role Tags (F63) */}
          {project.lookingForTags.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Looking for:
              </span>
              <div className="flex flex-wrap gap-1">
                {project.lookingForTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] bg-flame-500/10 text-flame-700 dark:text-flame-400 border border-flame-500/20 px-2 py-0.5 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
                {project.lookingForTags.length > 3 && (
                  <span className="font-mono text-[10px] text-muted-foreground self-center">
                    +{project.lookingForTags.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Team Avatars & Interest Button */}
        <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-3">
          {/* Team Roster Avatars */}
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5 overflow-hidden">
              {teamMembers.slice(0, 3).map((member) => (
                <Avatar
                  key={member!.id}
                  src={member!.profile.avatarUrl}
                  name={member!.profile.displayName}
                  size="xs"
                  className="ring-2 ring-card"
                />
              ))}
            </div>
            <span className="font-mono text-[11px] text-muted-foreground ml-1">
              {project.team.length} {project.team.length === 1 ? 'builder' : 'builders'}
            </span>
          </div>

          {/* Action CTA */}
          <div onClick={(e) => e.stopPropagation()}>
            {!isMember && !isApplied && onExpressInterest && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExpressInterest(project.id)}
                className="h-7 text-xs font-mono"
              >
                I'm interested
              </Button>
            )}
            {isApplied && (
              <span className="font-mono text-[11px] text-muted-foreground">
                Interest sent
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
