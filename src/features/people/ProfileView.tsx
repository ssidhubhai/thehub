import * as React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { Avatar, Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, EmptyState } from '@/components/primitives';
import { VerifiedBadge } from '@/components/primitives/VerifiedBadge';
import { PostCard } from '@/components/shared/PostCard';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { EditProfileModal } from './EditProfileModal';
import { AdminModerationModal } from './AdminModerationModal';
import {
  ArrowLeft,
  UserPlus,
  UserCheck,
  Clock,
  MessageSquare,
  BookOpen,
  Hammer,
  Calendar,
  Edit2,
  FolderGit2,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/primitives/Toast';

export interface ProfileViewProps {
  userId: string;
  onBack?: () => void;
  onOpenDirectChat?: (userId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToUser?: (userId: string) => void;
}

export function ProfileView({
  userId,
  onBack,
  onOpenDirectChat,
  onNavigateToProject,
  onNavigateToUser,
}: ProfileViewProps) {
  const { user: currentUser } = useAuthStore();
  const {
    people,
    connections,
    getConnectionStatus,
    sendConnectionRequest,
    acceptConnection,
    declineConnection,
  } = usePeopleStore();
  const { projects } = useProjectStore();
  const { posts } = useFeedStore();

  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isAdminModModalOpen, setIsAdminModModalOpen] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);

  // Find the target profile
  const profileUser = people.find((p) => p.id === userId || p.username === userId) || (currentUser?.id === userId ? currentUser : null);

  if (!profileUser) {
    return (
      <div className="py-12 text-center space-y-4">
        <EmptyState
          title="Member not found"
          description="We could not locate this builder in the community directory."
          actionLabel={onBack ? 'Back to Directory' : undefined}
          onAction={onBack}
        />
      </div>
    );
  }

  const isSelf = currentUser?.id === profileUser.id;
  const status = isSelf ? 'none' : getConnectionStatus(profileUser.id);

  const isProfileMod =
    profileUser.role === 'moderator' ||
    profileUser.role === 'admin' ||
    profileUser.profile?.role === 'moderator' ||
    profileUser.username === 'sidhu001';
  const isCurrentMod =
    currentUser?.role === 'moderator' ||
    currentUser?.role === 'admin' ||
    currentUser?.profile?.role === 'moderator' ||
    currentUser?.username === 'sidhu001';
  const canDirectChat = status === 'accepted' || isProfileMod || isCurrentMod;

  // Find incoming connection if pending_received
  const incomingConn = React.useMemo(() => {
    if (status !== 'pending_received' || !currentUser) return null;
    return connections.find(
      (c) => c.senderId === profileUser.id && c.recipientId === currentUser.id && c.status === 'pending'
    );
  }, [connections, status, profileUser.id, currentUser]);

  // Projects by this user (owner or contributor)
  const userProjects = projects.filter(
    (p) => p.ownerId === profileUser.id || p.team.some((m) => m.userId === profileUser.id)
  );

  // Posts by this user
  const userPosts = posts.filter((p) => p.authorId === profileUser.id);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await sendConnectionRequest(profileUser.id);
      toast.flame('Connection Requested', `Invitation sent to ${profileUser.profile.displayName}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send connection request');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAccept = async () => {
    if (!incomingConn) return;
    setIsConnecting(true);
    try {
      await acceptConnection(incomingConn.id);
      toast.flame('Connection Accepted', `You and ${profileUser.profile.displayName} are now connected.`);
    } catch {
      toast.error('Failed to accept connection');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDecline = async () => {
    if (!incomingConn) return;
    setIsConnecting(true);
    try {
      await declineConnection(incomingConn.id);
      toast.info('Connection Declined');
    } catch {
      toast.error('Failed to decline connection');
    } finally {
      setIsConnecting(false);
    }
  };

  const joinedDate = React.useMemo(() => {
    try {
      return format(new Date(profileUser.createdAt), 'MMMM yyyy');
    } catch {
      return 'September 2026';
    }
  }, [profileUser.createdAt]);

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
          <span>Back to People</span>
        </button>
      )}

      {/* Profile Header Hero (F48) */}
      <section className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <Avatar
              src={profileUser.profile.avatarUrl}
              name={profileUser.profile.displayName}
              size="xl"
              showPresence
              isOnline
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {profileUser.profile.displayName}
                </h1>
                <VerifiedBadge
                  role={profileUser.role || profileUser.profile?.role}
                  isVerified={profileUser.isVerified || profileUser.profile?.isVerified || profileUser.username === 'sidhu001'}
                  showRoleTag
                  size="md"
                />
                {isSelf && (
                  <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                    You
                  </Badge>
                )}
                {profileUser.moderationStatus && profileUser.moderationStatus !== 'active' && (
                  <Badge
                    variant={
                      profileUser.moderationStatus === 'banned'
                        ? 'destructive'
                        : profileUser.moderationStatus === 'paused'
                        ? 'warning'
                        : 'secondary'
                    }
                    size="sm"
                    className="font-mono text-[10px] uppercase font-bold"
                  >
                    {profileUser.moderationStatus}
                  </Badge>
                )}
              </div>
              <p className="font-mono text-xs sm:text-sm text-muted-foreground">
                @{profileUser.username}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono pt-0.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
                <span>Joined {joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 self-start flex-wrap">
            {/* ADMIN ONLY CONTROLS */}
            {isCurrentMod && !isSelf && (
              <Button
                variant="flame"
                size="sm"
                onClick={() => setIsAdminModModalOpen(true)}
                iconPrefix={<ShieldAlert className="h-3.5 w-3.5 text-amber-300" />}
                className="bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs shadow-sm"
              >
                Moderate Builder
              </Button>
            )}

            {isSelf ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                iconPrefix={<Edit2 className="h-3.5 w-3.5" />}
              >
                Edit Profile
              </Button>
            ) : status === 'accepted' ? (
              <div className="flex items-center gap-2">
                <Badge variant="success" size="md" className="gap-1.5 font-mono text-xs py-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  Connected
                </Badge>
                {onOpenDirectChat && (
                  <Button
                    variant="flame"
                    size="sm"
                    onClick={() => onOpenDirectChat(profileUser.id)}
                    iconPrefix={<MessageSquare className="h-3.5 w-3.5" />}
                  >
                    Message
                  </Button>
                )}
              </div>
            ) : status === 'pending_sent' ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" size="md" className="gap-1.5 font-mono text-xs py-1">
                  <Clock className="h-3.5 w-3.5" />
                  Connection Pending
                </Badge>
                {canDirectChat && onOpenDirectChat && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenDirectChat(profileUser.id)}
                    iconPrefix={<MessageSquare className="h-3.5 w-3.5" />}
                    className="text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
                  >
                    Direct Message
                  </Button>
                )}
              </div>
            ) : status === 'pending_received' ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="flame"
                  size="sm"
                  onClick={handleAccept}
                  disabled={isConnecting}
                >
                  Accept Connection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDecline}
                  disabled={isConnecting}
                >
                  Decline
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {canDirectChat && onOpenDirectChat && isProfileMod && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenDirectChat(profileUser.id)}
                    iconPrefix={<MessageSquare className="h-3.5 w-3.5" />}
                    className="text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
                  >
                    Ask for Help
                  </Button>
                )}
                <Button
                  variant="flame"
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  iconPrefix={<UserPlus className="h-3.5 w-3.5" />}
                >
                  Connect
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <p className="text-sm text-foreground/90 font-sans leading-relaxed max-w-2xl whitespace-pre-wrap">
          {profileUser.profile.bio || 'Exploring ideas, learning in public, and building with others.'}
        </p>

        {/* Focus Cards: Learning & Building (F49) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5 text-flame-500" />
              <span>Currently Learning</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {profileUser.profile.currentlyLearning || 'Not specified'}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground uppercase tracking-wider">
              <Hammer className="h-3.5 w-3.5 text-flame-500" />
              <span>Currently Building</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {profileUser.profile.currentlyBuilding || 'Not specified'}
            </p>
          </div>
        </div>

        {/* Interests & Tags */}
        {profileUser.profile.interests.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="font-mono text-xs text-muted-foreground mr-1">Interests:</span>
            {profileUser.profile.interests.map((interest) => (
              <Badge key={interest} variant="outline" size="sm" mono className="text-xs py-0.5 px-2.5">
                #{interest}
              </Badge>
            ))}
          </div>
        )}
      </section>

      {/* Tabs: Projects (F50) and Posts (F51) */}
      <Tabs defaultValue="projects">
        <TabsList variant="underline" className="border-b border-border/70 mb-6">
          <TabsTrigger value="projects" variant="underline">
            Projects ({userProjects.length})
          </TabsTrigger>
          <TabsTrigger value="posts" variant="underline">
            Posts ({userPosts.length})
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          {userProjects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description={`${profileUser.profile.displayName} hasn't created or joined any projects yet.`}
              icon={<FolderGit2 className="h-8 w-8 text-muted-foreground" />}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSelect={() => onNavigateToProject?.(project.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          {userPosts.length === 0 ? (
            <EmptyState
              title="No posts yet"
              description={`${profileUser.profile.displayName} hasn't shared any updates in Common Space yet.`}
              icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
            />
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onNavigateToUser={onNavigateToUser}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Profile Modal for Self */}
      {isSelf && (
        <EditProfileModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />
      )}

      {/* Admin Moderation Modal */}
      {isCurrentMod && !isSelf && (
        <AdminModerationModal
          user={profileUser}
          isOpen={isAdminModModalOpen}
          onClose={() => setIsAdminModModalOpen(false)}
        />
      )}
    </div>
  );
}
