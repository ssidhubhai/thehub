import * as React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useChatStore } from '@/stores/useChatStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { dbService } from '@/lib/firebase/db';

export function useRealtimeSync(intervalMs: number = 3000) {
  const { isAuthenticated, user } = useAuthStore();
  const { fetchPosts } = useFeedStore();
  const { fetchPeople, fetchConnections } = usePeopleStore();
  const { fetchProjects } = useProjectStore();
  const { fetchConversations, fetchMessages, activeConversationId } = useChatStore();
  const { fetchNotifications } = useNotificationStore();

  // Instant reactive Firestore listeners for real-time peer communication
  React.useEffect(() => {
    if (!isAuthenticated) return;

    const unsubs: Array<() => void> = [];

    try {
      unsubs.push(
        dbService.subscribe('conversations', () => {
          fetchConversations({ silent: true });
        })
      );
      unsubs.push(
        dbService.subscribe('messages', () => {
          const currentActive = useChatStore.getState().activeConversationId;
          if (currentActive) {
            fetchMessages(currentActive, { silent: true });
          }
          fetchConversations({ silent: true });
        })
      );
      unsubs.push(
        dbService.subscribe('connections', () => {
          fetchConnections({ silent: true });
        })
      );
      unsubs.push(
        dbService.subscribe('users', () => {
          fetchPeople({ silent: true });
        })
      );
      unsubs.push(
        dbService.subscribe('posts', () => {
          fetchPosts({ silent: true });
        })
      );
    } catch (e) {
      console.warn('[RealtimeSync] subscription setup error:', e);
    }

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {}
      });
    };
  }, [isAuthenticated, fetchConversations, fetchMessages, fetchConnections, fetchPeople, fetchPosts]);

  React.useEffect(() => {
    if (!isAuthenticated) return;

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
