import { create } from 'zustand';
import { InAppNotification } from '@/types/notification';
import { mockDb, STORAGE_KEYS } from '@/lib/firebase/mock/mockDb';
import { useAuthStore } from './useAuthStore';
import { api } from '@/lib/api';

export interface NotificationState {
  notifications: InAppNotification[];
  unreadCount: number;
  isDrawerOpen: boolean;
  isLoading: boolean;

  fetchNotifications: (options?: { silent?: boolean }) => Promise<void>;
  setDrawerOpen: (isOpen: boolean) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isDrawerOpen: false,
  isLoading: false,

  fetchNotifications: async (options?: { silent?: boolean }) => {
    if (!options?.silent) set({ isLoading: true });
    try {
      const serverNotifs = await api.notifications.list();
      const unread = serverNotifs.filter((n) => !n.isRead).length;
      set({
        notifications: serverNotifs,
        unreadCount: unread,
        isLoading: false,
      });
    } catch {
      try {
        const user = useAuthStore.getState().user;
        const localNotifs = await mockDb.list<InAppNotification>(
          STORAGE_KEYS.NOTIFICATIONS,
          user ? (n) => n.recipientId === user.id : undefined
        );
        set({
          notifications: localNotifs,
          unreadCount: localNotifs.filter((n) => !n.isRead).length,
          isLoading: false,
        });
      } catch {
        set({ isLoading: false });
      }
    }
  },

  setDrawerOpen: (isOpen: boolean) => set({ isDrawerOpen: isOpen }),

  markAsRead: async (notificationId: string) => {
    try {
      await api.notifications.markRead(notificationId);
    } catch {
      await mockDb.update<InAppNotification>(STORAGE_KEYS.NOTIFICATIONS, notificationId, {
        isRead: true,
      });
    }

    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      const unread = updated.filter((n) => !n.isRead).length;
      return { notifications: updated, unreadCount: unread };
    });
  },

  markAllAsRead: async () => {
    try {
      await api.notifications.markAllRead();
    } catch {
      const { notifications } = get();
      for (const notif of notifications.filter((n) => !n.isRead)) {
        await mockDb.update<InAppNotification>(STORAGE_KEYS.NOTIFICATIONS, notif.id, {
          isRead: true,
        });
      }
    }

    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  deleteNotification: async (notificationId: string) => {
    await mockDb.delete(STORAGE_KEYS.NOTIFICATIONS, notificationId);

    set((state) => {
      const filtered = state.notifications.filter((n) => n.id !== notificationId);
      const unread = filtered.filter((n) => !n.isRead).length;
      return { notifications: filtered, unreadCount: unread };
    });
  },

  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      isDrawerOpen: false,
      isLoading: false,
    });
  },
}));

