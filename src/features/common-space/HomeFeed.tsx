import * as React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { PostComposer } from './PostComposer';
import { PostCard } from '@/components/shared/PostCard';
import { Avatar, Badge, Skeleton, EmptyState } from '@/components/primitives';
import { Sparkles, Users, Hammer, ArrowRight, MessageSquare, FolderGit2 } from 'lucide-react';

export interface HomeFeedProps {
  onNavigateToUser?: (userId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToPeopleDirectory?: () => void;
  onNavigateToProjectsDirectory?: () => void;
  focusedPostId?: string | null;
}

export function HomeFeed({
  onNavigateToUser,
  onNavigateToProject,
  onNavigateToPeopleDirectory,
  onNavigateToProjectsDirectory,
  focusedPostId,
}: HomeFeedProps) {
  const { user } = useAuthStore();
  const { posts, isLoading: isFeedLoading, fetchPosts } = useFeedStore();
  const { people, fetchPeople } = usePeopleStore();
  const { projects, fetchProjects } = useProjectStore();

  React.useEffect(() => {
    fetchPosts();
    fetchPeople();
    fetchProjects();
  }, [fetchPosts, fetchPeople, fetchProjects]);

  // If focusedPostId is passed, scroll to it
  React.useEffect(() => {
    if (focusedPostId) {
      setTimeout(() => {
        const el = document.getElementById(`post-${focusedPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-flame-500', 'transition-all');
          setTimeout(() => el.classList.remove('ring-2', 'ring-flame-500'), 3000);
        }
      }, 300);
    }
  }, [focusedPostId, posts]);

  // Ensure feed posts are strictly ordered with pinned posts first
  const sortedPosts = React.useMemo(() => {
    return [...posts].sort((a, b) => {
      const aPin = Boolean(a.isPinned);
      const bPin = Boolean(b.isPinned);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts]);

  // Greeting calculation (F29)
  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  // Active builders for "PEOPLE WORTH KNOWING" (F42)
  const featuredPeople = people
    .filter((p) => p.id !== user?.id)
    .slice(0, 5);

  // Active projects for "WHAT PEOPLE ARE BUILDING" (F43)
  const featuredProjects = projects.slice(0, 4);

  return (
    <div className="space-y-8 text-left max-w-5xl mx-auto">
      {/* Editorial Time-Aware Header */}
      <section className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-flame-500" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Common Space • {timeGreeting}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {timeGreeting}, {user?.profile.displayName || 'Builder'}.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground leading-relaxed font-sans">
              See what’s happening with everyone. Discover projects, share thoughts, and build relationships that last.
            </p>
          </div>

          {user && (
            <button
              type="button"
              onClick={() => onNavigateToUser?.(user.id)}
              className="self-start sm:self-auto group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame-500 rounded-full"
            >
              <Avatar
                src={user.profile.avatarUrl}
                name={user.profile.displayName}
                size="xl"
                showPresence
                isOnline
                className="group-hover:scale-105 transition-transform"
              />
            </button>
          )}
        </div>
      </section>

      {/* Main Grid: Feed on left (2/3), Previews on right (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Composer + Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Collapsed/Expanded Post Composer */}
          <PostComposer />

          {/* Chronological Feed Header */}
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-bold text-sm tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-flame-500" />
              <span>COMMUNITY THREADS</span>
            </h2>
            <span className="font-mono text-[11px] text-muted-foreground">
              {sortedPosts.length} {sortedPosts.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          {/* Posts List */}
          {isFeedLoading && sortedPosts.length === 0 ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-36 w-full rounded-2xl" />
            </div>
          ) : sortedPosts.length === 0 ? (
            <EmptyState
              title="It's quiet here"
              description="Be the first to share something with your fellow community builders."
              icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
              actionLabel="Share Something"
              onAction={() => {
                window.scrollTo({ top: 120, behavior: 'smooth' });
              }}
            />
          ) : (
            <div className="space-y-5">
              {sortedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onNavigateToUser={onNavigateToUser}
                  defaultExpandedReplies={focusedPostId === post.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Previews for People and Projects */}
        <div className="space-y-6">
          {/* PEOPLE WORTH KNOWING (F42) */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-subtle space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-flame-500" />
                <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-foreground">
                  People Worth Knowing
                </h3>
              </div>
              <button
                type="button"
                onClick={onNavigateToPeopleDirectory}
                className="font-mono text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 group"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-3">
              {featuredPeople.length > 0 ? (
                featuredPeople.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => onNavigateToUser?.(person.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigateToUser?.(person.id)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <Avatar
                        src={person.profile.avatarUrl}
                        name={person.profile.displayName}
                        size="sm"
                        showPresence
                        isOnline
                      />
                      <div className="truncate">
                        <p className="font-display font-semibold text-xs text-foreground group-hover:underline truncate">
                          {person.profile.displayName}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground truncate">
                          @{person.username}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" size="sm" className="shrink-0 text-[10px] font-mono py-0">
                      Profile
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-muted-foreground space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">No other builders registered yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* WHAT PEOPLE ARE BUILDING (F43) */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-subtle space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-flame-500" />
                <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-foreground">
                  What People Are Building
                </h3>
              </div>
              <button
                type="button"
                onClick={onNavigateToProjectsDirectory}
                className="font-mono text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 group"
              >
                <span>All projects</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-3">
              {featuredProjects.length > 0 ? (
                featuredProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => onNavigateToProject?.(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigateToProject?.(project.id)}
                    className="p-3 rounded-xl border border-border/60 hover:border-border hover:bg-muted/30 transition-all cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-xs text-foreground group-hover:underline truncate">
                        {project.name}
                      </h4>
                      <span className="font-mono text-[10px] text-flame-600 dark:text-flame-400 font-semibold">
                        {project.team.length} {project.team.length === 1 ? 'builder' : 'builders'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {project.tagline || project.description}
                    </p>
                    {project.lookingForTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {project.lookingForTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-muted-foreground space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">No projects shared yet.</p>
                  <p className="text-[11px] text-muted-foreground/80">Create the first project repo!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
