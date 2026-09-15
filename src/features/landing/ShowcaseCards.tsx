import * as React from 'react';
import { Avatar } from '@/components/primitives/Avatar';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { Flame, MessageSquare, ArrowRight, ExternalLink, Sparkles, FolderGit2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { User } from '@/types/user';
import { Project } from '@/types/project';
import { Post } from '@/types/post';

export interface ShowcaseCardsProps {
  onJoinClick: () => void;
}

export const ShowcaseCards: React.FC<ShowcaseCardsProps> = ({ onJoinClick }) => {
  const [builders, setBuilders] = React.useState<User[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [post, setPost] = React.useState<Post | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [usersData, projectsData, feedData] = await Promise.all([
          api.users.list().catch(() => []),
          api.projects.list().catch(() => []),
          api.posts.list().catch(() => ({ posts: [] })),
        ]);

        if (!isMounted) return;
        setBuilders(usersData || []);
        setProjects(projectsData || []);
        if (feedData.posts && feedData.posts.length > 0) {
          setPost(feedData.posts[0]);
        }
      } catch {
        // Quiet fallback
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const featuredBuilders = builders.slice(0, 3);
  const featuredProjects = projects.slice(0, 2);

  return (
    <section id="showcase" className="py-16 sm:py-24 border-t border-border/70">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-flame-500" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Community Pulse
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              What’s happening inside The Hub.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
              A peek into real students shipping bytecode interpreters, distributed consensus,
              and design tooling right now.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onJoinClick}
            iconSuffix={<ArrowRight className="h-3.5 w-3.5 ml-1" />}
            className="self-start sm:self-auto"
          >
            Explore all members & projects
          </Button>
        </div>

        {/* 3-Column Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMN 1: FEATURED BUILDERS */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Builders
              </span>
              <Badge variant="secondary" size="sm" mono>
                {builders.length} Total
              </Badge>
            </div>

            <div className="space-y-4 flex-1">
              {featuredBuilders.length > 0 ? (
                featuredBuilders.map((builder) => (
                  <div
                    key={builder.id}
                    className="rounded-xl border border-border/60 p-3.5 hover:border-foreground/20 hover:bg-muted/30 transition-all duration-200 space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={builder.profile.avatarUrl}
                        name={builder.profile.displayName || builder.username}
                        size="md"
                        showPresence
                        isOnline={builder.presence.status === 'online'}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-display font-bold text-sm text-foreground truncate">
                            {builder.profile.displayName || builder.username}
                          </p>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            @{builder.username}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {builder.profile.currentlyBuilding || builder.profile.bio || 'Building on The Hub'}
                        </p>
                      </div>
                    </div>

                    {Array.isArray(builder?.profile?.interests) && builder.profile.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {builder.profile.interests.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" size="sm" mono className="text-[10px] py-0 px-1.5">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground space-y-2">
                  <Users className="h-8 w-8 mx-auto opacity-30" />
                  <p className="text-xs font-mono">No other builders yet.</p>
                  <p className="text-[11px] text-muted-foreground/80">Be among the first to create your profile.</p>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onJoinClick}
              className="w-full text-xs text-muted-foreground hover:text-foreground mt-2"
            >
              Join to view all builder profiles →
            </Button>
          </div>

          {/* COLUMN 2: TRENDING PROJECTS */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Collaborative Projects
              </span>
              <Badge variant="secondary" size="sm" mono>
                {projects.length} Active
              </Badge>
            </div>

            <div className="space-y-4 flex-1">
              {featuredProjects.length > 0 ? (
                featuredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-xl border border-border/60 p-4 hover:border-foreground/20 hover:bg-muted/30 transition-all duration-200 space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-display font-bold text-sm text-foreground">
                          {project.name}
                        </h4>
                        {project.links?.[0] && (
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {project.tagline || project.description}
                      </p>
                    </div>

                    {Array.isArray(project.lookingForTags) && project.lookingForTags.length > 0 && (
                      <div className="space-y-1">
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">
                          Looking for:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {project.lookingForTags.slice(0, 2).map((role) => (
                            <Badge key={role} variant="flame" size="sm" mono className="text-[10px] py-0 px-1.5">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground space-y-2">
                  <FolderGit2 className="h-8 w-8 mx-auto opacity-30" />
                  <p className="text-xs font-mono">No active projects yet.</p>
                  <p className="text-[11px] text-muted-foreground/80">Start your repository and find collaborators.</p>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onJoinClick}
              className="w-full text-xs text-muted-foreground hover:text-foreground mt-2"
            >
              Browse open contributor roles →
            </Button>
          </div>

          {/* COLUMN 3: SAMPLE COMMON SPACE DISCUSSION */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Persistent Common Space
              </span>
              <Badge variant="flame" size="sm" mono>
                Live Feed
              </Badge>
            </div>

            {post ? (
              <div className="rounded-xl border border-border/60 p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={post.author.avatarUrl}
                      name={post.author.displayName}
                      size="sm"
                    />
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">
                        {post.author.displayName}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        @{post.author.username}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-foreground leading-relaxed">
                    {post.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-flame-600 dark:text-flame-400 font-mono font-medium">
                    <Flame className="h-4 w-4 fill-flame-500 text-flame-500" />
                    <span>{post.reactionCount}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{post.commentCount} replies</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground space-y-2 flex-1 flex flex-col items-center justify-center">
                <MessageSquare className="h-8 w-8 opacity-30" />
                <p className="text-xs font-mono">No discussions yet.</p>
                <p className="text-[11px] text-muted-foreground/80">Share your latest build notes and findings.</p>
              </div>
            )}

            <Button
              variant="flame"
              size="sm"
              onClick={onJoinClick}
              className="w-full text-xs mt-2"
            >
              Sign up to join the conversation
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
