import { create } from 'zustand';
import { User } from '@/types/user';
import { Connection } from '@/types/common';
import { mockDb, STORAGE_KEYS } from '@/lib/firebase/mock/mockDb';
import { useAuthStore } from './useAuthStore';
import { InAppNotification } from '@/types/notification';
import { api } from '@/lib/api';

export interface PeopleState {
  people: User[];
  connections: Connection[];
  searchQuery: string;
  selectedInterests: string[];
  isLoading: boolean;

  fetchPeople: () => Promise<void>;
  fetchConnections: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleInterest: (tag: string) => void;
  clearFilters: () => void;

  sendConnectionRequest: (targetUserId: string) => Promise<Connection>;
  acceptConnection: (connectionId: string) => Promise<void>;
  declineConnection: (connectionId: string) => Promise<void>;

  getConnectionStatus: (
    targetUserId: string
  ) => 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  canMessage: (targetUserId: string) => boolean;
  reset: () => void;
}

export const usePeopleStore = create<PeopleState>((set, get) => ({
  people: [],
  connections: [],
  searchQuery: '',
  selectedInterests: [],
  isLoading: false,

  fetchPeople: async () => {
    set({ isLoading: true });
    try {
      const serverUsers = await api.users.list();
      set({ people: serverUsers, isLoading: false });
    } catch {
      try {
        mockDb.ensureInitialized();
        const allUsers = await mockDb.list<User>(STORAGE_KEYS.USERS);
        set({ people: allUsers, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    }
  },

  fetchConnections: async () => {
    try {
      const serverConns = await api.connections.list();
      set({ connections: serverConns });
    } catch {
      try {
        mockDb.ensureInitialized();
        const allConns = await mockDb.list<Connection>(STORAGE_KEYS.CONNECTIONS);
        set({ connections: allConns });
      } catch (err) {
        console.error('Error fetching connections:', err);
      }
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  toggleInterest: (tag: string) =>
    set((state) => ({
      selectedInterests: state.selectedInterests.includes(tag)
        ? state.selectedInterests.filter((t) => t !== tag)
        : [...state.selectedInterests, tag],
    })),

  clearFilters: () => set({ searchQuery: '', selectedInterests: [] }),

  sendConnectionRequest: async (targetUserId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');
    if (user.id === targetUserId) throw new Error('Cannot connect to yourself');

    const status = get().getConnectionStatus(targetUserId);
    if (status !== 'none') {
      throw new Error('Connection request already in progress or accepted');
    }

    try {
      const created = await api.connections.request(targetUserId);
      set((state) => ({
        connections: [...state.connections, created],
      }));
      return created;
    } catch (apiErr: any) {
      if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      const now = new Date().toISOString();
      const newConnData: Omit<Connection, 'id'> = {
        senderId: user.id,
        recipientId: targetUserId,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      const created = await mockDb.create<Connection>(STORAGE_KEYS.CONNECTIONS, newConnData as any);

      const notif: Omit<InAppNotification, 'id'> = {
        recipientId: targetUserId,
        type: 'connection_request',
        payload: {
          actorId: user.id,
          actorName: user.profile.displayName,
          actorAvatarUrl: user.profile.avatarUrl,
          actorAvatarInitials: user.profile.avatarInitials,
          targetId: created.id,
          targetTitle: 'Connection Request',
          messageSnippet: `${user.profile.displayName} wants to connect with you.`,
          deepLinkUrl: `/people?profile=${user.username}`,
        },
        isRead: false,
        createdAt: now,
      };
      await mockDb.create<InAppNotification>(STORAGE_KEYS.NOTIFICATIONS, notif as any);

      set((state) => ({
        connections: [...state.connections, created],
      }));

      return created;
    }
  },

  acceptConnection: async (connectionId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    try {
      await api.connections.accept(connectionId);
      const now = new Date().toISOString();
      set((state) => ({
        connections: state.connections.map((c) =>
          c.id === connectionId ? { ...c, status: 'accepted', updatedAt: now } : c
        ),
      }));
    } catch (apiErr: any) {
      if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      const conn = await mockDb.get<Connection>(STORAGE_KEYS.CONNECTIONS, connectionId);
      if (!conn) throw new Error('Connection not found');
      if (conn.recipientId !== user.id) {
        throw new Error('Only the recipient can accept a connection request');
      }

      const now = new Date().toISOString();
      await mockDb.update<Connection>(STORAGE_KEYS.CONNECTIONS, connectionId, {
        status: 'accepted',
        updatedAt: now,
      });

      const notif: Omit<InAppNotification, 'id'> = {
        recipientId: conn.senderId,
        type: 'connection_accepted',
        payload: {
          actorId: user.id,
          actorName: user.profile.displayName,
          actorAvatarUrl: user.profile.avatarUrl,
          actorAvatarInitials: user.profile.avatarInitials,
          targetId: conn.id,
          targetTitle: 'Connection Accepted',
          messageSnippet: `${user.profile.displayName} accepted your connection request!`,
          deepLinkUrl: `/people?profile=${user.username}`,
        },
        isRead: false,
        createdAt: now,
      };
      await mockDb.create<InAppNotification>(STORAGE_KEYS.NOTIFICATIONS, notif as any);

      set((state) => ({
        connections: state.connections.map((c) =>
          c.id === connectionId ? { ...c, status: 'accepted', updatedAt: now } : c
        ),
      }));
    }
  },

  declineConnection: async (connectionId: string) => {
    try {
      await api.connections.decline(connectionId);
    } catch {
      await mockDb.delete(STORAGE_KEYS.CONNECTIONS, connectionId);
    }
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== connectionId),
    }));
  },

  getConnectionStatus: (targetUserId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return 'none';
    if (user.id === targetUserId) return 'none';

    const conn = get().connections.find(
      (c) =>
        (c.senderId === user.id && c.recipientId === targetUserId) ||
        (c.senderId === targetUserId && c.recipientId === user.id)
    );

    if (!conn) return 'none';
    if (conn.status === 'accepted') return 'accepted';
    if (conn.senderId === user.id) return 'pending_sent';
    return 'pending_received';
  },

  canMessage: (targetUserId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return false;
    // Moderators/Admins can message anyone, and anyone can reach a moderator for help without connection gating
    const isCurrentMod =
      currentUser.role === 'moderator' ||
      currentUser.role === 'admin' ||
      currentUser.profile?.role === 'moderator' ||
      currentUser.username === 'sidhu001';
    const targetUser = get().people.find((p) => p.id === targetUserId);
    const isTargetMod =
      targetUser?.role === 'moderator' ||
      targetUser?.role === 'admin' ||
      targetUser?.profile?.role === 'moderator' ||
      targetUser?.username === 'sidhu001';

    if (isCurrentMod || isTargetMod) return true;

    return get().getConnectionStatus(targetUserId) === 'accepted';
  },

  reset: () => {
    set({
      people: [],
      connections: [],
      searchQuery: '',
      selectedInterests: [],
      isLoading: false,
    });
  },
}));

