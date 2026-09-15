import { create } from 'zustand';
import { Conversation, Message } from '@/types/message';
import { mockDb, STORAGE_KEYS } from '@/lib/firebase/mock/mockDb';
import { useAuthStore } from './useAuthStore';
import { usePeopleStore } from './usePeopleStore';
import { api } from '@/lib/api';

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  activeTab: 'private' | 'groups';
  isLoading: boolean;
  isSending: boolean;
  blockedUserIds: string[];
  mutedConversationIds: string[];

  fetchConversations: () => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  setActiveTab: (tab: 'private' | 'groups') => void;
  fetchMessages: (conversationId: string) => Promise<Message[]>;
  sendMessage: (
    conversationId: string,
    content: string,
    quotedMessageId?: string,
    imageUrl?: string
  ) => Promise<Message>;
  editMessage: (
    conversationId: string,
    messageId: string,
    content: string
  ) => Promise<void>;
  deleteMessage: (
    conversationId: string,
    messageId: string
  ) => Promise<void>;
  toggleBlockUser: (targetUserId: string) => void;
  toggleMuteConversation: (conversationId: string) => void;
  isUserBlocked: (userId: string) => boolean;
  isConversationMuted: (conversationId: string) => boolean;
  startOrGetDirectChat: (targetUserId: string) => Promise<Conversation>;
  createGroupChat: (
    title: string,
    participantIds: string[],
    description?: string
  ) => Promise<Conversation>;
  markAsRead: (conversationId: string) => Promise<void>;
  reset: () => void;
}

const getStoredBlockedUsers = (): string[] => {
  try {
    const raw = localStorage.getItem('hub_blocked_users');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const getStoredMutedConvs = (): string[] => {
  try {
    const raw = localStorage.getItem('hub_muted_convs');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  activeTab: 'groups',
  isLoading: false,
  isSending: false,
  blockedUserIds: getStoredBlockedUsers(),
  mutedConversationIds: getStoredMutedConvs(),

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const serverConvs = await api.conversations.list();
      let convs = Array.isArray(serverConvs) ? serverConvs : [];
      const hasGeneral = convs.some((c) => c.type === 'general' || c.id === 'conv_general');
      if (!hasGeneral) {
        convs.unshift({
          id: 'conv_general',
          type: 'general',
          title: 'The Hub — General Community',
          description: 'Public common space for all builders and members of The Hub to hang out, share ideas, and talk!',
          participantIds: ['user_sidhu001'],
          unreadCounts: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
          lastMessage: {
            senderId: 'user_sidhu001',
            senderDisplayName: 'Sidhu',
            content: 'Welcome everyone to The Hub! Feel free to introduce yourself, share what you are building, or ask any questions.',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        });
      }
      set({ conversations: convs, isLoading: false });
    } catch {
      try {
        mockDb.ensureInitialized();
        const user = useAuthStore.getState().user;
        const allConvs = await mockDb.list<Conversation>(STORAGE_KEYS.CONVERSATIONS);

        // Filter conversations for the current user (or include General)
        const userConvs = user
          ? allConvs.filter(
              (c) => c.type === 'general' || c.id === 'conv_general' || c.participantIds.includes(user.id)
            )
          : allConvs.filter((c) => c.type === 'general' || c.id === 'conv_general');

        if (!userConvs.some((c) => c.type === 'general' || c.id === 'conv_general')) {
          userConvs.unshift({
            id: 'conv_general',
            type: 'general',
            title: 'The Hub — General Community',
            description: 'Public common space for all builders and members of The Hub to hang out, share ideas, and talk!',
            participantIds: ['user_sidhu001'],
            unreadCounts: {},
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: new Date().toISOString(),
            lastMessage: {
              senderId: 'user_sidhu001',
              senderDisplayName: 'Sidhu',
              content: 'Welcome everyone to The Hub! Feel free to introduce yourself, share what you are building, or ask any questions.',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          });
        }

        // Sort with latest message / updatedAt first
        const sorted = [...userConvs].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        set({ conversations: sorted, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    }
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id) {
      get().fetchMessages(id);
      get().markAsRead(id);
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchMessages: async (conversationId: string) => {
    try {
      const serverMessages = await api.conversations.listMessages(conversationId);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: serverMessages,
        },
      }));
      return serverMessages;
    } catch {
      mockDb.ensureInitialized();
      const allMessages = await mockDb.list<Message>(
        STORAGE_KEYS.MESSAGES,
        (m) => m.conversationId === conversationId
      );

      // Sort ascending by time
      const sorted = [...allMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: sorted,
        },
      }));

      return sorted;
    }
  },

  sendMessage: async (conversationId: string, content: string, quotedMessageId?: string, imageUrl?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to send messages');

    const cleanContent = content.trim();
    if (!cleanContent && !imageUrl) throw new Error('Message cannot be empty');

    set({ isSending: true });

    try {
      const created = await api.conversations.sendMessage(conversationId, cleanContent, quotedMessageId, imageUrl);
      const now = new Date().toISOString();
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] || []), created],
        },
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: {
                  senderId: user.id,
                  senderDisplayName: user.profile.displayName,
                  content: cleanContent || 'Attached an image',
                  createdAt: now,
                },
                updatedAt: now,
              }
            : c
        ),
        isSending: false,
      }));

      return created;
    } catch {
      const now = new Date().toISOString();
      const newMessageData: Omit<Message, 'id'> = {
        conversationId,
        senderId: user.id,
        sender: {
          id: user.id,
          username: user.username,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          avatarInitials: user.profile.avatarInitials,
        },
        content: cleanContent,
        imageUrl,
        quotedMessageId,
        createdAt: now,
        updatedAt: now,
      };

      try {
        const created = await mockDb.create<Message>(
          STORAGE_KEYS.MESSAGES,
          newMessageData as any
        );

        // Update lastMessage on conversation
        await mockDb.update<Conversation>(STORAGE_KEYS.CONVERSATIONS, conversationId, {
          lastMessage: {
            senderId: user.id,
            senderDisplayName: user.profile.displayName,
            content: cleanContent,
            createdAt: now,
          },
          updatedAt: now,
        });

        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), created],
          },
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: {
                    senderId: user.id,
                    senderDisplayName: user.profile.displayName,
                    content: cleanContent,
                    createdAt: now,
                  },
                  updatedAt: now,
                }
              : c
          ),
          isSending: false,
        }));

        return created;
      } catch (err) {
        set({ isSending: false });
        throw err;
      }
    }
  },

  startOrGetDirectChat: async (targetUserId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    // Verification guard: hybrid connection must be accepted
    const canMsg = usePeopleStore.getState().canMessage(targetUserId);
    if (!canMsg) {
      throw new Error('You must have an accepted connection before starting a direct chat');
    }

    try {
      const conv = await api.conversations.createDirect(targetUserId);
      set((state) => ({
        conversations: state.conversations.some((c) => c.id === conv.id)
          ? state.conversations
          : [conv, ...state.conversations],
        activeConversationId: conv.id,
        activeTab: 'private',
      }));
      return conv;
    } catch (apiErr: any) {
      if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }

      const { conversations } = get();
      const existing = conversations.find(
        (c) =>
          c.type === 'direct' &&
          c.participantIds.includes(user.id) &&
          c.participantIds.includes(targetUserId)
      );

      if (existing) {
        set({ activeConversationId: existing.id, activeTab: 'private' });
        return existing;
      }

      const now = new Date().toISOString();
      const newConv: Omit<Conversation, 'id'> = {
        type: 'direct',
        participantIds: [user.id, targetUserId],
        unreadCounts: {},
        createdAt: now,
        updatedAt: now,
      };

      const created = await mockDb.create<Conversation>(
        STORAGE_KEYS.CONVERSATIONS,
        newConv as any
      );

      set((state) => ({
        conversations: [created, ...state.conversations],
        activeConversationId: created.id,
        activeTab: 'private',
      }));

      return created;
    }
  },

  createGroupChat: async (title: string, participantIds: string[], description?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    const cleanTitle = title.trim();
    if (!cleanTitle) throw new Error('Group title is required');

    try {
      const conv = await api.conversations.createGroup(cleanTitle, participantIds, description);
      set((state) => ({
        conversations: [conv, ...state.conversations],
        activeConversationId: conv.id,
        activeTab: 'groups',
      }));
      return conv;
    } catch {
      const allParticipants = Array.from(new Set([user.id, ...participantIds]));
      const now = new Date().toISOString();

      const newConv: Omit<Conversation, 'id'> = {
        type: 'custom_group',
        title: cleanTitle,
        description,
        participantIds: allParticipants,
        unreadCounts: {},
        createdAt: now,
        updatedAt: now,
      };

      const created = await mockDb.create<Conversation>(
        STORAGE_KEYS.CONVERSATIONS,
        newConv as any
      );

      set((state) => ({
        conversations: [created, ...state.conversations],
        activeConversationId: created.id,
        activeTab: 'groups',
      }));

      return created;
    }
  },

  markAsRead: async (conversationId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      await api.conversations.markRead(conversationId);
    } catch {
      // ignore
    }

    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!conv) return;

    const currentUnreads = { ...conv.unreadCounts };
    if (currentUnreads[user.id]) {
      currentUnreads[user.id] = 0;
      await mockDb.update<Conversation>(STORAGE_KEYS.CONVERSATIONS, conversationId, {
        unreadCounts: currentUnreads,
      });

      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCounts: currentUnreads } : c
        ),
      }));
    }
  },

  editMessage: async (conversationId: string, messageId: string, content: string) => {
    const cleanContent = content.trim();
    if (!cleanContent) return;

    try {
      const updated = await api.conversations.editMessage(conversationId, messageId, cleanContent);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === messageId ? updated : m
          ),
        },
      }));
    } catch {
      // Fallback for mock db
      await mockDb.update<Message>(STORAGE_KEYS.MESSAGES, messageId, {
        content: cleanContent,
        updatedAt: new Date().toISOString(),
      });
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) =>
            m.id === messageId
              ? { ...m, content: cleanContent, updatedAt: new Date().toISOString() }
              : m
          ),
        },
      }));
    }
  },

  deleteMessage: async (conversationId: string, messageId: string) => {
    try {
      await api.conversations.deleteMessage(conversationId, messageId);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).filter(
            (m) => m.id !== messageId
          ),
        },
      }));
    } catch {
      // Fallback for mock db
      await mockDb.delete(STORAGE_KEYS.MESSAGES, messageId);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).filter(
            (m) => m.id !== messageId
          ),
        },
      }));
    }
  },

  toggleBlockUser: (targetUserId: string) => {
    set((state) => {
      const isBlocked = state.blockedUserIds.includes(targetUserId);
      const nextBlocked = isBlocked
        ? state.blockedUserIds.filter((id) => id !== targetUserId)
        : [...state.blockedUserIds, targetUserId];
      try {
        localStorage.setItem('hub_blocked_users', JSON.stringify(nextBlocked));
      } catch {
        // ignore
      }
      return { blockedUserIds: nextBlocked };
    });
  },

  toggleMuteConversation: (conversationId: string) => {
    set((state) => {
      const isMuted = state.mutedConversationIds.includes(conversationId);
      const nextMuted = isMuted
        ? state.mutedConversationIds.filter((id) => id !== conversationId)
        : [...state.mutedConversationIds, conversationId];
      try {
        localStorage.setItem('hub_muted_convs', JSON.stringify(nextMuted));
      } catch {
        // ignore
      }
      return { mutedConversationIds: nextMuted };
    });
  },

  isUserBlocked: (userId: string) => {
    return get().blockedUserIds.includes(userId);
  },

  isConversationMuted: (conversationId: string) => {
    return get().mutedConversationIds.includes(conversationId);
  },

  reset: () => {
    set({
      conversations: [],
      activeConversationId: null,
      messages: {},
      activeTab: 'groups',
      isLoading: false,
      isSending: false,
    });
  },
}));

