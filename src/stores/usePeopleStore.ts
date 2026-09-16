import { create } from 'zustand';
import { User } from '@/types/user';
import { Connection } from '@/types/common';
import { mockDb, STORAGE_KEYS } from '@/lib/firebase/mock/mockDb';
import { dbService } from '@/lib/firebase/db';
import { useAuthStore } from './useAuthStore';
import { InAppNotification } from '@/types/notification';
import { api } from '@/lib/api';

export interface PeopleState {
  people: User[];
  connections: Connection[];
  searchQuery: string;
  selectedInterests: string[];
  isLoading: boolean;

  fetchPeople: (options?: { silent?: boolean }) => Promise<void>;
  fetchConnections: (options?: { silent?: boolean }) => Promise<void>;
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
  updateUserModeration: (
    userId: string,
    moderationStatus: 'active' | 'muted' | 'paused' | 'banned',
    moderationReason?: string
  ) => Promise<User>;
  reset: () => void;
}

export const usePeopleStore = create<PeopleState>((set, get) => ({
  people: [],
  connections: [],
  searchQuery: '',
  selectedInterests: [],
  isLoading: false,

  fetchPeople: async (options?: { silent?: boolean }) => {
    if (!options?.silent) set({ isLoading: true });
    try {
      const serverUsers = await api.users.list();
      set({ people: serverUsers, isLoading: false });
    } catch {
      try {
        const users = await dbService.list<User>('users');
        set({ people: users, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    }
  },

  fetchConnections: async (options?: { silent?: boolean }) => {
    try {
      const serverConns = await api.connections.list();
      set({ connections: serverConns });
    } catch {
      try {
        const user = useAuthStore.getState().user;
        const allConns = await dbService.list<Connection>('connections');
        const userConns = user ? allConns.filter((c) => c.senderId === user.id || c.recipientId === user.id) : allConns;
        set({ connections: userConns });
      } catch {
        // ignore
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
        connections: [...state.connections.filter((c) => c.id !== created.id), created],
      }));
      return created;
    } catch (apiErr: any) {
      if (apiErr.message?.includes('already exists') || apiErr.message?.includes('Cannot connect')) {
        throw apiErr;
      }
      const created = await mockDb.connect(user.id, targetUserId);
      set((state) => ({
        connections: [...state.connections.filter((c) => c.id !== created.id), created],
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
      const updated = await mockDb.acceptConnection(connectionId, user.id);
      set((state) => ({
        connections: state.connections.map((c) =>
          c.id === connectionId ? updated : c
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

  updateUserModeration: async (
    userId: string,
    moderationStatus: 'active' | 'muted' | 'paused' | 'banned',
    moderationReason?: string
  ) => {
    const res = await api.users.updateModeration(userId, moderationStatus, moderationReason);
    if (res.user) {
      set((state) => ({
        people: state.people.map((p) => (p.id === res.user.id ? res.user : p)),
      }));
      // If updating current logged in user
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentUser.id === res.user.id) {
        useAuthStore.setState({ user: res.user });
      }
      return res.user;
    }
    throw new Error('Failed to update user moderation status');
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

