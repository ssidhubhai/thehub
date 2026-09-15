import * as React from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';
import {
  Avatar,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
  Input,
  EmptyState,
} from '@/components/primitives';
import { ProjectInterestModal } from './ProjectInterestModal';
import {
  ArrowLeft,
  ExternalLink,
  Github,
  Globe,
  FileText,
  Sparkles,
  Send,
  Plus,
  MessageSquare,
  History,
  CheckCircle2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from '@/components/primitives/Toast';

export interface ProjectDetailViewProps {
  projectId: string;
  onBack?: () => void;
  onNavigateToUser?: (userId: string) => void;
  onOpenTeamChat?: (conversationId: string) => void;
  defaultTab?: 'overview' | 'roster' | 'updates' | 'discussion';
}

export function ProjectDetailView({
  projectId,
  onBack,
  onNavigateToUser,
  onOpenTeamChat,
  defaultTab = 'overview',
}: ProjectDetailViewProps) {
  const { user } = useAuthStore();
  const { people } = usePeopleStore();
  const {
    projects,
    updates,
    discussions,
    userInterests,
    fetchProjectDetails,
    addProjectUpdate,
    addDiscussion,
  } = useProjectStore();
  const { conversations, createGroupChat } = useChatStore();

  const [isInterestModalOpen, setIsInterestModalOpen] = React.useState(false);

  // New Update form state (owner only)
  const [isAddingUpdate, setIsAddingUpdate] = React.useState(false);
  const [updateTitle, setUpdateTitle] = React.useState('');
  const [updateContent, setUpdateContent] = React.useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = React.useState(false);

  // Discussion composer state
  const [discussionContent, setDiscussionContent] = React.useState('');
  const [isSubmittingDiscussion, setIsSubmittingDiscussion] = React.useState(false);

  React.useEffect(() => {
    fetchProjectDetails(projectId);
  }, [projectId, fetchProjectDetails]);

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="py-12 text-center">
        <EmptyState
          title="Project not found"
          description="We could not locate this project in the directory."
          actionLabel={onBack ? 'Back to Projects' : undefined}
          onAction={onBack}
        />
      </div>
    );
  }

  const isOwner = user?.id === project.ownerId;
  const isMember = project.team.some((m) => m.userId === user?.id);
  const hasExpressedInterest = userInterests[project.id];

  const projectUpdates = updates[project.id] || [];
  const projectDiscussions = discussions[project.id] || [];

  // Team roster resolved to user profiles
  const teamWithProfiles = project.team.map((m) => ({
    member: m,
    profile: people.find((p) => p.id === m.userId),
  }));

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTitle.trim() || !updateContent.trim()) return;

    setIsSubmittingUpdate(true);
    try {
      await addProjectUpdate(project.id, updateTitle.trim(), updateContent.trim());
      setUpdateTitle('');
      setUpdateContent('');
      setIsAddingUpdate(false);
      toast.flame('Update Published', 'Your project milestone has been logged.');
    } catch {
      toast.error('Failed to post project update');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handlePostDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionContent.trim() || !user) return;

    setIsSubmittingDiscussion(true);
    try {
      await addDiscussion(project.id, discussionContent.trim());
      setDiscussionContent('');
      toast.flame('Comment Posted', 'Your message has been added to the project discussion.');
    } catch {
      toast.error('Failed to post discussion comment');
    } finally {
      setIsSubmittingDiscussion(false);
    }
  };

  const handleOpenOrStartTeamChat = async () => {
    // Check if team chat conversation already exists
    const existingChat = conversations.find(
      (c) => c.projectId === project.id || (c.type === 'project_group' && c.title?.includes(project.name))
    );

    if (existingChat) {
      onOpenTeamChat?.(existingChat.id);
    } else {
      // Create new project team chat with all team members
      try {
        const memberIds = project.team.map((t) => t.userId);
        if (user && !memberIds.includes(user.id)) memberIds.push(user.id);
        const newChat = await createGroupChat(
          `${project.name} Team`,
          memberIds,
          `Collaborative room for ${project.name}`
        );
        onOpenTeamChat?.(newChat.id);
      } catch {
        toast.error('Could not start project team chat');
      }
    }
  };

  return (
    <div className="space-y-8 text-left max-w-4xl mx-auto">
      {/* Back Button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Projects</span>
        </button>
      )}

      {/* Hero Banner & Header (F61) */}
      <section className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-subtle">
        {project.coverImageUrl ? (
          <div className="h-48 sm:h-64 w-full overflow-hidden bg-muted">
            <img
              src={project.coverImageUrl}
              alt={project.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-28 sm:h-36 w-full bg-gradient-to-r from-muted/80 via-card to-background border-b border-border/60" />
        )}

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {project.name}
                </h1>
                {isOwner && (
                  <Badge variant="flame" size="sm" className="font-mono text-[10px]">
                    Project Owner
                  </Badge>
                )}
                {isMember && !isOwner && (
                  <Badge variant="secondary" size="sm" className="font-mono text-[10px]">
                    Team Contributor
                  </Badge>
                )}
              </div>
              <p className="text-base text-foreground/90 font-sans leading-relaxed">
                {project.tagline}
              </p>
            </div>

            {/* Main Action CTAs */}
            <div className="flex items-center gap-2.5 shrink-0 self-start">
              {!isMember && !hasExpressedInterest && (
                <Button
                  variant="flame"
                  size="md"
                  onClick={() => setIsInterestModalOpen(true)}
                  iconPrefix={<Sparkles className="h-4 w-4" />}
                >
                  I'm interested
                </Button>
              )}

              {hasExpressedInterest && !isMember && (
                <Badge variant="success" size="md" className="gap-1.5 font-mono text-xs py-1.5 px-3">
                  <CheckCircle2 className="h-4 w-4" />
                  Interest Sent
                </Badge>
              )}

              {(isMember || isOwner) && onOpenTeamChat && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleOpenOrStartTeamChat}
                  iconPrefix={<MessageSquare className="h-4 w-4" />}
                >
                  Team Chat
                </Button>
              )}
            </div>
          </div>

          {/* External Links (F60) */}
          {project.links && project.links.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
              <span className="font-mono text-xs text-muted-foreground mr-1">Links:</span>
              {project.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border/70 bg-muted/30 text-xs font-medium text-foreground hover:bg-muted transition-colors group"
                >
                  {link.type === 'github' ? (
                    <Github className="h-3.5 w-3.5" />
                  ) : link.type === 'demo' ? (
                    <Globe className="h-3.5 w-3.5" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  <span>{link.label}</span>
                  <ExternalLink className="h-2.5 w-2.5 text-muted-foreground group-hover:text-foreground" />
                </a>
              ))}
            </div>
          )}

          {/* "Looking for" Roles Callout (F63) */}
          {project.lookingForTags.length > 0 && (
            <div className="p-4 rounded-xl bg-flame-500/5 border border-flame-500/20 space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-flame-500" />
                <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
                  Open Contributor Roles & Skills
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.lookingForTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    size="sm"
                    className="font-mono text-xs bg-card border border-border/60 text-foreground"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tabs: Overview, Team Roster, Updates, Discussion */}
      <Tabs defaultValue={defaultTab}>
        <TabsList variant="underline" className="border-b border-border/70 mb-6">
          <TabsTrigger value="overview" variant="underline">
            Overview
          </TabsTrigger>
          <TabsTrigger value="roster" variant="underline">
            Team Roster ({project.team.length})
          </TabsTrigger>
          <TabsTrigger value="updates" variant="underline">
            Updates ({projectUpdates.length})
          </TabsTrigger>
          <TabsTrigger value="discussion" variant="underline">
            Discussion ({projectDiscussions.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-subtle space-y-4">
            <h3 className="font-display font-bold text-lg text-foreground">About the Project</h3>
            <div className="text-sm text-foreground/90 font-sans leading-relaxed whitespace-pre-wrap">
              {project.description}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: TEAM ROSTER (F62) */}
        <TabsContent value="roster" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teamWithProfiles.map(({ member, profile }, idx) => {
              if (!profile) return null;
              const isOwnerMember = member.role === 'owner';
              return (
                <div
                  key={idx}
                  onClick={() => onNavigateToUser?.(profile.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigateToUser?.(profile.id)}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/80 bg-card hover:border-border hover:bg-muted/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={profile.profile.avatarUrl}
                      name={profile.profile.displayName}
                      size="md"
                      showPresence
                      isOnline
                    />
                    <div>
                      <h4 className="font-display font-bold text-sm text-foreground group-hover:underline">
                        {profile.profile.displayName}
                      </h4>
                      <p className="font-mono text-xs text-muted-foreground">@{profile.username}</p>
                    </div>
                  </div>

                  <Badge
                    variant={isOwnerMember ? 'flame' : 'secondary'}
                    size="sm"
                    className="font-mono text-[10px] uppercase tracking-wider"
                  >
                    {isOwnerMember ? 'Owner' : 'Contributor'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 3: PROJECT UPDATES (F66, F67) */}
        <TabsContent value="updates" className="space-y-6">
          {/* Owner Update Composer */}
          {isOwner && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-subtle space-y-4">
              {!isAddingUpdate ? (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-display font-bold text-sm text-foreground">Post Project Changelog</h4>
                    <p className="text-xs text-muted-foreground">Share milestones, release notes, or blockers with the community.</p>
                  </div>
                  <Button
                    variant="flame"
                    size="sm"
                    onClick={() => setIsAddingUpdate(true)}
                    iconPrefix={<Plus className="h-3.5 w-3.5" />}
                  >
                    New Update
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePostUpdate} className="space-y-3">
                  <h4 className="font-display font-bold text-sm text-foreground">Publish Milestone Update</h4>
                  <Input
                    label="Milestone Title"
                    value={updateTitle}
                    onChange={(e) => setUpdateTitle(e.target.value)}
                    required
                    placeholder="e.g. v0.2 Alpha Live, 100 Early Signups"
                  />
                  <Textarea
                    label="Update Details"
                    value={updateContent}
                    onChange={(e) => setUpdateContent(e.target.value)}
                    required
                    rows={4}
                    placeholder="Detail what was built, challenges faced, and what comes next..."
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingUpdate(false)}
                      disabled={isSubmittingUpdate}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="flame"
                      size="sm"
                      disabled={isSubmittingUpdate || !updateTitle.trim()}
                    >
                      {isSubmittingUpdate ? 'Publishing...' : 'Publish Update'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Updates Changelog Timeline */}
          {projectUpdates.length === 0 ? (
            <EmptyState
              title="No updates logged yet"
              description="Project milestones and changelog devlogs will appear here as the team makes progress."
              icon={<History className="h-8 w-8 text-muted-foreground" />}
            />
          ) : (
            <div className="space-y-4 pl-4 border-l-2 border-border/70">
              {projectUpdates.map((item) => (
                <div key={item.id} className="relative rounded-2xl border border-border/80 bg-card p-5 space-y-2">
                  <div className="absolute -left-[25px] top-6 h-3 w-3 rounded-full bg-flame-500 ring-4 ring-background" />
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display font-bold text-base text-foreground">{item.title}</h4>
                    <time className="font-mono text-xs text-muted-foreground">
                      {format(new Date(item.createdAt), 'MMM d, yyyy')}
                    </time>
                  </div>
                  <p className="text-sm text-foreground/90 font-sans leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: PROJECT DISCUSSION (F68) */}
        <TabsContent value="discussion" className="space-y-6">
          {/* Discussion Composer */}
          {user && (
            <form onSubmit={handlePostDiscussion} className="flex gap-3 items-start">
              <Avatar
                src={user.profile.avatarUrl}
                name={user.profile.displayName}
                size="sm"
                className="mt-1 shrink-0"
              />
              <div className="flex-1 space-y-2">
                <Textarea
                  value={discussionContent}
                  onChange={(e) => setDiscussionContent(e.target.value)}
                  placeholder={`Ask a question or share feedback on ${project.name}...`}
                  rows={2}
                  className="w-full text-sm font-sans"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="flame"
                    size="sm"
                    disabled={isSubmittingDiscussion || !discussionContent.trim()}
                    iconPrefix={<Send className="h-3.5 w-3.5" />}
                  >
                    {isSubmittingDiscussion ? 'Posting...' : 'Comment'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Discussion List */}
          {projectDiscussions.length === 0 ? (
            <EmptyState
              title="No discussion comments yet"
              description="Be the first to ask a question or leave feedback for the team."
              icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
            />
          ) : (
            <div className="space-y-3">
              {projectDiscussions.map((disc) => (
                <div key={disc.id} className="flex items-start gap-3 p-4 rounded-xl border border-border/70 bg-card">
                  <Avatar
                    src={disc.author.avatarUrl}
                    name={disc.author.displayName}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-xs text-foreground">
                          {disc.author.displayName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          @{disc.author.username}
                        </span>
                      </div>
                      <time className="font-mono text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(disc.createdAt), { addSuffix: true })}
                      </time>
                    </div>
                    <p className="text-xs text-foreground/90 font-sans leading-relaxed whitespace-pre-wrap">
                      {disc.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Project Interest Modal */}
      <ProjectInterestModal
        project={project}
        open={isInterestModalOpen}
        onOpenChange={setIsInterestModalOpen}
      />
    </div>
  );
}
