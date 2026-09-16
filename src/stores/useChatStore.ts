import { create } from 'zustand';
import { Conversation, Message } from '@/types/message';
import { mockDb, STORAGE_KEYS } from '@/lib/firebase/mock/mockDb';
import { dbService } from '@/lib/firebase/db';
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

  fetchConversations: (options?: { silent?: boolean }) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  setActiveTab: (tab: 'private' | 'groups') => void;
  fetchMessages: (conversationId: string, options?: { silent?: boolean }) => Promise<Message[]>;
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
  pinMessage: (
    conversationId: string,
    messageId: string | null
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

  fetchConversations: async (options?: { silent?: boolean }) => {
    if (!options?.silent) set({ isLoading: true });
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
        const localConvs = await dbService.list<Conversation>('conversations');
        let convs = Array.isArray(localConvs) ? localConvs : [];
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

  fetchMessages: async (conversationId: string, options?: { silent?: boolean }) => {
    try {
      const serverMessages = await api.conversations.listMessages(conversationId);
      if (Array.isArray(serverMessages)) {
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: serverMessages,
          },
        }));
        return serverMessages;
      }
    } catch (err) {
      // Fallback to Firestore and local storage
    }

    try {
      const allMsgs = await dbService.list<Message>('messages');
      const convMsgs = allMsgs.filter((m) => m.conversationId === conversationId);
      if (convMsgs.length > 0) {
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: convMsgs,
          },
        }));
        return convMsgs;
      }
    } catch {}

    try {
      const allMsgs = await mockDb.list<Message>(STORAGE_KEYS.MESSAGES);
      const convMsgs = allMsgs.filter((m) => m.conversationId === conversationId);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: convMsgs,
        },
      }));
      return convMsgs;
    } catch {
      return get().messages[conversationId] || [];
    }
  },

  sendMessage: async (conversationId: string, content: string, quotedMessageId?: string, imageUrl?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to send messages');

    const cleanContent = content.trim();
    if (!cleanContent && !imageUrl) throw new Error('Message cannot be empty');

    set({ isSending: true });

    let created: Message | null = null;
    try {
      created = await api.conversations.sendMessage(conversationId, cleanContent, quotedMessageId, imageUrl);
    } catch (err) {
      console.warn('[Chat] API sendMessage failed, using dbService fallback:', err);
    }

    const now = new Date().toISOString();
    const message: Message = created || {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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

    // Save message to both dbService (Firestore) and mockDb
    try {
      await dbService.set<Message>('messages', message.id, message);
    } catch {}
    try {
      await mockDb.create<Message>(STORAGE_KEYS.MESSAGES, message as any);
    } catch {}

    // Update lastMessage on conversation
    const lastMsgUpdate = {
      lastMessage: {
        senderId: user.id,
        senderDisplayName: user.profile.displayName,
        content: cleanContent || (imageUrl ? 'Shared an image' : ''),
        createdAt: now,
      },
      updatedAt: now,
    };

    try {
      await dbService.update<Conversation>('conversations', conversationId, lastMsgUpdate);
    } catch {}
    try {
      await mockDb.update<Conversation>(STORAGE_KEYS.CONVERSATIONS, conversationId, lastMsgUpdate);
    } catch {}

    set((state) => {
      const existing = state.messages[conversationId] || [];
      const updated = existing.some((m) => m.id === message.id)
        ? existing.map((m) => (m.id === message.id ? message : m))
        : [...existing, message];

      return {
        messages: {
          ...state.messages,
          [conversationId]: updated,
        },
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, ...lastMsgUpdate } : c
        ),
        isSending: false,
      };
    });

    return message;
  },

  startOrGetDirectChat: async (targetUserId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    // Verification guard: hybrid connection must be accepted (or either party is a moderator)
    const canMsg = usePeopleStore.getState().canMessage(targetUserId);
    if (!canMsg) {
      throw new Error('You must have an accepted connection before starting a direct chat');
    }

    try {
      const conv = await api.conversations.createDirect(targetUserId);
      if (conv && conv.id) {
        try {
          await dbService.set<Conversation>('conversations', conv.id, conv);
        } catch {}
        try {
          await mockDb.create<Conversation>(STORAGE_KEYS.CONVERSATIONS, conv as any);
        } catch {}

        set((state) => ({
          conversations: state.conversations.some((c) => c.id === conv.id)
            ? state.conversations
            : [conv, ...state.conversations],
          activeConversationId: conv.id,
          activeTab: 'private',
        }));
        return conv;
      }
    } catch (apiErr: any) {
      console.warn('[Chat] api.conversations.createDirect fallback triggered:', apiErr?.message);
    }

    // Direct search or creation fallback (Firestore + mockDb)
    const { conversations } = get();
    let existing = conversations.find(
      (c) =>
        c.type === 'direct' &&
        c.participantIds.includes(user.id) &&
        c.participantIds.includes(targetUserId)
    );

    if (!existing) {
      try {
        const firestoreConvs = await dbService.list<Conversation>('conversations');
        existing = firestoreConvs.find(
          (c) =>
            c.type === 'direct' &&
            c.participantIds.includes(user.id) &&
            c.participantIds.includes(targetUserId)
        );
      } catch {}
    }

    if (!existing) {
      try {
        const localConvs = await mockDb.list<Conversation>(STORAGE_KEYS.CONVERSATIONS);
        existing = localConvs.find(
          (c) =>
            c.type === 'direct' &&
            c.participantIds.includes(user.id) &&
            c.participantIds.includes(targetUserId)
        );
      } catch {}
    }

    if (existing) {
      set((state) => ({
        conversations: state.conversations.some((c) => c.id === existing!.id)
          ? state.conversations
          : [existing!, ...state.conversations],
        activeConversationId: existing!.id,
        activeTab: 'private',
      }));
      return existing;
    }

    const now = new Date().toISOString();
    const newConv: Conversation = {
      id: `conv_dm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'direct',
      participantIds: [user.id, targetUserId],
      unreadCounts: {},
      createdAt: now,
      updatedAt: now,
    };

    try {
      await dbService.set<Conversation>('conversations', newConv.id, newConv);
    } catch (err) {
      console.warn('[Chat] dbService.set fallback error:', err);
    }
    try {
      await mockDb.create<Conversation>(STORAGE_KEYS.CONVERSATIONS, newConv as any);
    } catch {}

    set((state) => ({
      conversations: [newConv, ...state.conversations.filter((c) => c.id !== newConv.id)],
      activeConversationId: newConv.id,
      activeTab: 'private',
    }));

    return newConv;
  },

  createGroupChat: async (title: string, participantIds: string[], description?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    const cleanTitle = title.trim();
    if (!cleanTitle) throw new Error('Group title is required');

    let createdConv: Conversation | null = null;
    try {
      createdConv = await api.conversations.createGroup(cleanTitle, participantIds, description);
    } catch (err) {
      console.warn('[Chat] api.conversations.createGroup failed, falling back:', err);
    }

    const allParticipants = Array.from(new Set([user.id, ...participantIds]));
    const now = new Date().toISOString();

    const newConv: Conversation = createdConv || {
      id: `conv_grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'custom_group',
      title: cleanTitle,
      description,
      participantIds: allParticipants,
      unreadCounts: {},
      createdAt: now,
      updatedAt: now,
    };

    try {
      await dbService.set<Conversation>('conversations', newConv.id, newConv);
    } catch {}
    try {
      await mockDb.create<Conversation>(STORAGE_KEYS.CONVERSATIONS, newConv as any);
    } catch {}

    set((state) => ({
      conversations: [newConv, ...state.conversations.filter((c) => c.id !== newConv.id)],
      activeConversationId: newConv.id,
      activeTab: 'groups',
    }));

    return newConv;
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
      try {
        await dbService.update<Conversation>('conversations', conversationId, { unreadCounts: currentUnreads });
      } catch {}
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
      // Fallback for dbService and mock db
      const updateData = {
        content: cleanContent,
        updatedAt: new Date().toISOString(),
      };
      try {
        await dbService.update<Message>('messages', messageId, updateData);
      } catch {}
      await mockDb.update<Message>(STORAGE_KEYS.MESSAGES, messageId, updateData);
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
      // Fallback for dbService and mock db
      try {
        await dbService.delete('messages', messageId);
      } catch {}
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

  pinMessage: async (conversationId: string, messageId: string | null) => {
    try {
      const updated = await api.conversations.pinMessage(conversationId, messageId);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, pinnedMessageId: messageId } : c
        ),
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) => ({
            ...m,
            isPinned: Boolean(messageId && m.id === messageId),
          })),
        },
      }));
    } catch {
      const updateData = {
        pinnedMessageId: messageId,
        updatedAt: new Date().toISOString(),
      };
      try {
        await dbService.update<Conversation>('conversations', conversationId, updateData);
      } catch {}
      await mockDb.update<Conversation>(STORAGE_KEYS.CONVERSATIONS, conversationId, updateData);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, pinnedMessageId: messageId } : c
        ),
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map((m) => ({
            ...m,
            isPinned: Boolean(messageId && m.id === messageId),
          })),
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

