import * as React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useChatStore } from '@/stores/useChatStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { mockDb } from '@/lib/firebase';
import { Flame } from 'lucide-react';
import { ToastContainer, toast, Button } from '@/components/primitives';
import { LandingPage } from '@/features/landing';
import { OnboardingWizard } from '@/features/auth';
import { Shell, NavTab } from '@/components/layout';
import { HomeFeed } from '@/features/common-space';
import { PeopleDirectory, ProfileView } from '@/features/people';
import { ProjectsDirectory, ProjectDetailView } from '@/features/projects';
import { MessagingView } from '@/features/messages';

export function App() {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    init: initAuth,
  } = useAuthStore();

  const { fetchPosts } = useFeedStore();
  const { fetchPeople, fetchConnections } = usePeopleStore();
  const { fetchProjects } = useProjectStore();
  const { fetchConversations, setActiveConversation, startOrGetDirectChat } = useChatStore();
  const { fetchNotifications } = useNotificationStore();

  // Navigation state
  const [currentTab, setCurrentTab] = React.useState<NavTab>('home');
  const [activeProfileUserId, setActiveProfileUserId] = React.useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
  const [activeChatConversationId, setActiveChatConversationId] = React.useState<string | null>(null);
  const [focusedPostId, setFocusedPostId] = React.useState<string | null>(null);

  const [activeTheme, setActiveTheme] = React.useState<'light' | 'dark'>('light');
  const [previewLanding, setPreviewLanding] = React.useState(false);

  // Initialize data on mount
  React.useEffect(() => {
    mockDb.ensureInitialized();
    initAuth();
  }, [initAuth]);

  // When authenticated, prefetch stores
  React.useEffect(() => {
    if (isAuthenticated && user?.profile.isOnboarded) {
      fetchPosts();
      fetchPeople();
      fetchConnections();
      fetchProjects();
      fetchConversations();
      fetchNotifications();
    }
  }, [
    isAuthenticated,
    user?.profile.isOnboarded,
    fetchPosts,
    fetchPeople,
    fetchConnections,
    fetchProjects,
    fetchConversations,
    fetchNotifications,
  ]);

  const toggleDarkMode = () => {
    const nextTheme = activeTheme === 'light' ? 'dark' : 'light';
    setActiveTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Deep-linking navigation engine (F86)
  const handleNavigateToTargetUrl = (url: string) => {
    try {
      // e.g. "/people?profile=usr-123"
      if (url.includes('/people') || url.includes('profile=')) {
        const match = url.match(/profile=([^&]+)/);
        const userId = match ? match[1] : null;
        setCurrentTab('people');
        if (userId) setActiveProfileUserId(userId);
      } else if (url.includes('/projects') || url.includes('project=')) {
        // e.g. "/projects/proj-001" or "/projects?project=proj-001"
        const pathMatch = url.match(/\/projects\/([^?#/]+)/);
        const queryMatch = url.match(/project=([^&]+)/);
        const projId = pathMatch ? pathMatch[1] : queryMatch ? queryMatch[1] : null;
        setCurrentTab('projects');
        if (projId) setActiveProjectId(projId);
      } else if (url.includes('/common-space') || url.includes('post=')) {
        // e.g. "/common-space?post=post-123"
        const match = url.match(/post=([^&]+)/);
        const postId = match ? match[1] : null;
        setCurrentTab('home');
        if (postId) setFocusedPostId(postId);
      } else if (url.includes('/messages') || url.includes('chat=')) {
        // e.g. "/messages?chat=conv-456"
        const match = url.match(/chat=([^&]+)/);
        const chatId = match ? match[1] : null;
        setCurrentTab('messages');
        if (chatId) {
          setActiveChatConversationId(chatId);
          setActiveConversation(chatId);
        }
      }
    } catch (err) {
      console.error('Deep link navigation error:', err);
    }
  };

  // Direct chat transition from profile or card
  const handleOpenDirectChatWithUser = async (targetUserId: string) => {
    try {
      const conv = await startOrGetDirectChat(targetUserId);
      setCurrentTab('messages');
      setActiveChatConversationId(conv.id);
      setActiveConversation(conv.id);
    } catch (err: any) {
      toast.error(err?.message || 'Could not start conversation');
    }
  };

  // State 0: Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-float animate-pulse">
          <Flame className="h-7 w-7 text-flame-500 fill-flame-500" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Entering The Hub...
        </p>
        <ToastContainer />
      </div>
    );
  }

  // State 1: Unauthenticated or Previewing Landing Page
  if (!isAuthenticated || !user || previewLanding) {
    return (
      <>
        {previewLanding && isAuthenticated && (
          <div className="bg-foreground text-background py-2 px-4 text-center text-xs font-mono flex items-center justify-center gap-3 z-50 sticky top-0 shadow-md">
            <span>Previewing Public Landing Page as @{user?.username}</span>
            <Button
              variant="flame"
              size="sm"
              onClick={() => setPreviewLanding(false)}
              className="py-0.5 px-2.5 text-[11px] h-6"
            >
              Return to Hub
            </Button>
          </div>
        )}
        <LandingPage
          activeTheme={activeTheme}
          onToggleTheme={toggleDarkMode}
          onAuthSuccess={() => setPreviewLanding(false)}
        />
        <ToastContainer />
      </>
    );
  }

  // State 2: Authenticated but Not Yet Onboarded
  if (!user.profile.isOnboarded) {
    return (
      <>
        <OnboardingWizard />
        <ToastContainer />
      </>
    );
  }

  // State 3: Fully Authenticated & Onboarded Community App
  return (
    <Shell
      currentTab={currentTab}
      onTabChange={(tab) => {
        setCurrentTab(tab);
        // Reset subview when navigating tabs
        if (tab === 'people') setActiveProfileUserId(null);
        if (tab === 'projects') setActiveProjectId(null);
        if (tab === 'home') setFocusedPostId(null);
      }}
      activeTheme={activeTheme}
      onToggleTheme={toggleDarkMode}
      onViewOwnProfile={() => {
        setCurrentTab('people');
        setActiveProfileUserId(user.id);
      }}
      onNavigateToUser={(userId) => {
        setCurrentTab('people');
        setActiveProfileUserId(userId);
      }}
      onNavigateToProject={(projectId) => {
        setCurrentTab('projects');
        setActiveProjectId(projectId);
      }}
      onNavigateToPost={(postId) => {
        setCurrentTab('home');
        setFocusedPostId(postId);
      }}
      onNavigateToTargetUrl={handleNavigateToTargetUrl}
    >
      {/* Tab 1: HOME (Common Space Feed & Previews) */}
      {currentTab === 'home' && (
        <HomeFeed
          onNavigateToUser={(userId) => {
            setCurrentTab('people');
            setActiveProfileUserId(userId);
          }}
          onNavigateToProject={(projectId) => {
            setCurrentTab('projects');
            setActiveProjectId(projectId);
          }}
          onNavigateToPeopleDirectory={() => {
            setCurrentTab('people');
            setActiveProfileUserId(null);
          }}
          onNavigateToProjectsDirectory={() => {
            setCurrentTab('projects');
            setActiveProjectId(null);
          }}
          focusedPostId={focusedPostId}
        />
      )}

      {/* Tab 2: PEOPLE (Directory or Single Profile View) */}
      {currentTab === 'people' && (
        activeProfileUserId ? (
          <ProfileView
            userId={activeProfileUserId}
            onBack={() => setActiveProfileUserId(null)}
            onOpenDirectChat={handleOpenDirectChatWithUser}
            onNavigateToProject={(projectId) => {
              setCurrentTab('projects');
              setActiveProjectId(projectId);
            }}
            onNavigateToUser={(userId) => setActiveProfileUserId(userId)}
          />
        ) : (
          <PeopleDirectory
            onSelectPerson={(userId) => setActiveProfileUserId(userId)}
            onOpenDirectChat={handleOpenDirectChatWithUser}
          />
        )
      )}

      {/* Tab 3: PROJECTS (Directory or Single Project Detail View) */}
      {currentTab === 'projects' && (
        activeProjectId ? (
          <ProjectDetailView
            projectId={activeProjectId}
            onBack={() => setActiveProjectId(null)}
            onNavigateToUser={(userId) => {
              setCurrentTab('people');
              setActiveProfileUserId(userId);
            }}
            onOpenTeamChat={(convId) => {
              setCurrentTab('messages');
              setActiveChatConversationId(convId);
              setActiveConversation(convId);
            }}
          />
        ) : (
          <ProjectsDirectory
            onSelectProject={(projectId) => setActiveProjectId(projectId)}
          />
        )
      )}

      {/* Tab 4: MESSAGES (Inbox & Chat Rooms) */}
      {currentTab === 'messages' && (
        <MessagingView
          initialConversationId={activeChatConversationId}
          onNavigateToUser={(userId) => {
            setCurrentTab('people');
            setActiveProfileUserId(userId);
          }}
        />
      )}
    </Shell>
  );
}

export default App;
