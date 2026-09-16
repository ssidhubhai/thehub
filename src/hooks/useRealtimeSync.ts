import * as React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useChatStore } from '@/stores/useChatStore';
import { useNotificationStore } from '@/stores/useNotificationStore';

export function useRealtimeSync(intervalMs: number = 3000) {
  const { isAuthenticated, user } = useAuthStore();
  const { fetchPosts } = useFeedStore();
  const { fetchPeople, fetchConnections } = usePeopleStore();
  const { fetchProjects } = useProjectStore();
  const { fetchConversations, fetchMessages, activeConversationId } = useChatStore();
  const { fetchNotifications } = useNotificationStore();

  React.useEffect(() => {
    if (!isAuthenticated || !user?.profile.isOnboarded) return;

    // Background silent sync loop
    const timer = setInterval(() => {
      fetchPosts({ silent: true });
      fetchPeople({ silent: true });
      fetchConnections({ silent: true });
      fetchProjects({ silent: true });
      fetchConversations({ silent: true });
      fetchNotifications({ silent: true });

      if (activeConversationId) {
        fetchMessages(activeConversationId, { silent: true });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    isAuthenticated,
    user?.profile.isOnboarded,
    activeConversationId,
    fetchPosts,
    fetchPeople,
    fetchConnections,
    fetchProjects,
    fetchConversations,
    fetchMessages,
    fetchNotifications,
    intervalMs,
  ]);
}
