import * as React from 'react';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { Dialog, DialogContent, Avatar } from '@/components/primitives';
import {
  Search,
  Users,
  FolderGit2,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToUser?: (userId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToPost?: (postId: string) => void;
}

interface FlattenedResult {
  id: string;
  type: 'person' | 'project' | 'post';
  title: string;
  subtitle: string;
  avatarUrl?: string;
  initials?: string;
  tags?: string[];
  rawId: string;
}

export function GlobalSearchModal({
  open,
  onOpenChange,
  onNavigateToUser,
  onNavigateToProject,
  onNavigateToPost,
}: GlobalSearchModalProps) {
  const { people } = usePeopleStore();
  const { projects } = useProjectStore();
  const { posts } = useFeedStore();

  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Global keyboard shortcut listener for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Compute grouped search results (F88)
  const results = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { people: [], projects: [], posts: [], flattened: [] };
    }

    const matchedPeople: FlattenedResult[] = people
      .filter(
        (p) =>
          p.profile.displayName.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q) ||
          p.profile.bio.toLowerCase().includes(q) ||
          p.profile.interests?.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 4)
      .map((p) => ({
        id: `person-${p.id}`,
        type: 'person',
        title: p.profile.displayName,
        subtitle: `@${p.username} • ${p.profile.bio || 'Builder'}`,
        avatarUrl: p.profile.avatarUrl,
        initials: p.profile.displayName,
        tags: p.profile.interests?.slice(0, 2),
        rawId: p.id,
      }));

    const matchedProjects: FlattenedResult[] = projects
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.lookingForTags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 4)
      .map((p) => ({
        id: `project-${p.id}`,
        type: 'project',
        title: p.name,
        subtitle: p.tagline || p.description,
        tags: p.lookingForTags.slice(0, 2),
        rawId: p.id,
      }));

    const matchedPosts: FlattenedResult[] = posts
      .filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.author.displayName.toLowerCase().includes(q) ||
          p.author.username.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((p) => ({
        id: `post-${p.id}`,
        type: 'post',
        title: `${p.author.displayName}: "${p.content.slice(0, 60)}${p.content.length > 60 ? '...' : ''}"`,
        subtitle: `@${p.author.username} in Common Space`,
        avatarUrl: p.author.avatarUrl,
        initials: p.author.displayName,
        rawId: p.id,
      }));

    const flattened = [...matchedPeople, ...matchedProjects, ...matchedPosts];
    return { people: matchedPeople, projects: matchedProjects, posts: matchedPosts, flattened };
  }, [query, people, projects, posts]);

  const handleSelect = (item: FlattenedResult) => {
    onOpenChange(false);
    if (item.type === 'person') {
      onNavigateToUser?.(item.rawId);
    } else if (item.type === 'project') {
      onNavigateToProject?.(item.rawId);
    } else if (item.type === 'post') {
      onNavigateToPost?.(item.rawId);
    }
  };

  // Keyboard navigation (F89)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.flattened.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.flattened.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.flattened.length) % results.flattened.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results.flattened[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border bg-card shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border/80 gap-3">
          <Search className="h-5 w-5 text-flame-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search across builders, projects, and threads..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center font-mono text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded bg-muted/40">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-left">
          {!query.trim() ? (
            <div className="py-10 text-center space-y-1">
              <p className="font-mono text-xs text-muted-foreground">
                Type keywords to find community builders, active projects, or discussions.
              </p>
              <p className="font-mono text-[11px] text-muted-foreground/60">
                Use ↑ ↓ arrows to navigate and Enter to select.
              </p>
            </div>
          ) : results.flattened.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <p className="font-display font-semibold text-sm text-foreground">
                No results for "{query}"
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                Try searching for specific skills, builder names, or project topics.
              </p>
            </div>
          ) : (
            <>
              {/* Group 1: People */}
              {results.people.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-2 font-mono text-[10px] uppercase font-bold text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>People ({results.people.length})</span>
                  </div>
                  {results.people.map((item) => {
                    const globalIdx = results.flattened.findIndex((f) => f.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-foreground text-background font-medium'
                            : 'hover:bg-muted/40 text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <Avatar
                            src={item.avatarUrl}
                            name={item.title}
                            size="sm"
                          />
                          <div className="truncate">
                            <p className="font-display font-bold text-xs truncate">{item.title}</p>
                            <p
                              className={cn(
                                'text-[11px] font-sans truncate',
                                isSelected ? 'text-background/80' : 'text-muted-foreground'
                              )}
                            >
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <ArrowRight
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            isSelected ? 'text-background' : 'text-muted-foreground'
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group 2: Projects */}
              {results.projects.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-2 font-mono text-[10px] uppercase font-bold text-muted-foreground">
                    <FolderGit2 className="h-3 w-3" />
                    <span>Projects ({results.projects.length})</span>
                  </div>
                  {results.projects.map((item) => {
                    const globalIdx = results.flattened.findIndex((f) => f.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-foreground text-background font-medium'
                            : 'hover:bg-muted/40 text-foreground'
                        )}
                      >
                        <div className="space-y-0.5 truncate pr-2">
                          <p className="font-display font-bold text-xs truncate">{item.title}</p>
                          <p
                            className={cn(
                              'text-[11px] font-sans truncate',
                              isSelected ? 'text-background/80' : 'text-muted-foreground'
                            )}
                          >
                            {item.subtitle}
                          </p>
                        </div>
                        <ArrowRight
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            isSelected ? 'text-background' : 'text-muted-foreground'
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group 3: Posts */}
              {results.posts.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-2 font-mono text-[10px] uppercase font-bold text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Posts & Threads ({results.posts.length})</span>
                  </div>
                  {results.posts.map((item) => {
                    const globalIdx = results.flattened.findIndex((f) => f.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-foreground text-background font-medium'
                            : 'hover:bg-muted/40 text-foreground'
                        )}
                      >
                        <div className="space-y-0.5 truncate pr-2">
                          <p className="font-display font-bold text-xs truncate">{item.title}</p>
                          <p
                            className={cn(
                              'text-[11px] font-sans truncate',
                              isSelected ? 'text-background/80' : 'text-muted-foreground'
                            )}
                          >
                            {item.subtitle}
                          </p>
                        </div>
                        <ArrowRight
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            isSelected ? 'text-background' : 'text-muted-foreground'
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
