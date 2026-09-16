import { create } from 'zustand';
import { Post, Comment, Reaction, PostAttachment } from '@/types/post';
import { mockDb, STORAGE_KEYS } from '@/lib/firebase/mock/mockDb';
import { dbService } from '@/lib/firebase/db';
import { useAuthStore } from './useAuthStore';
import { InAppNotification } from '@/types/notification';
import { api } from '@/lib/api';

export interface FeedState {
  posts: Post[];
  comments: Record<string, Comment[]>;
  reactions: Reaction[];
  isLoading: boolean;
  isPosting: boolean;

  fetchPosts: (options?: { silent?: boolean }) => Promise<void>;
  fetchComments: (postId: string) => Promise<Comment[]>;
  createPost: (content: string, attachment?: PostAttachment, isPinned?: boolean) => Promise<Post>;
  editPost: (postId: string, newContent: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  togglePinPost: (postId: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  toggleReaction: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<Comment>;
  hasReacted: (postId: string, userId?: string) => boolean;
  reset: () => void;
}

export const sortPostsWithPinned = (items: Post[]): Post[] => {
  return [...items].sort((a, b) => {
    const aPin = Boolean(a.isPinned);
    const bPin = Boolean(b.isPinned);
    if (aPin && !bPin) return -1;
    if (!aPin && bPin) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  comments: {},
  reactions: [],
  isLoading: false,
  isPosting: false,

  fetchPosts: async (options?: { silent?: boolean }) => {
    if (!options?.silent) set({ isLoading: true });
    try {
      const data = await api.posts.list();
      set({
        posts: sortPostsWithPinned(data.posts || []),
        reactions: data.reactions || [],
        isLoading: false,
      });
    } catch {
      try {
        const localPosts = await dbService.list<Post>('posts');
        const localReactions = await dbService.list<Reaction>('reactions');
        set({
          posts: sortPostsWithPinned(localPosts),
          reactions: localReactions,
          isLoading: false,
        });
      } catch {
        set({ isLoading: false });
      }
    }
  },

  fetchComments: async (postId: string) => {
    try {
      const serverComments = await api.posts.listComments(postId);
      set((state) => ({
        comments: {
          ...state.comments,
          [postId]: serverComments,
        },
      }));
      return serverComments;
    } catch {
      try {
        const allComments = await dbService.list<Comment>('comments', (c) => c.postId === postId);
        set((state) => ({
          comments: {
            ...state.comments,
            [postId]: allComments,
          },
        }));
        return allComments;
      } catch {
        return get().comments[postId] || [];
      }
    }
  },

  createPost: async (content: string, attachment?: PostAttachment, isPinned?: boolean) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to post');

    set({ isPosting: true });
    try {
      const created = await api.posts.create(content, attachment, isPinned);
      set((state) => ({
        posts: [created, ...state.posts].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
        isPosting: false,
      }));
      return created;
    } catch {
      const now = new Date().toISOString();
      const newPost: Post = {
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        authorId: user.id,
        author: {
          id: user.id,
          username: user.username,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          avatarInitials: user.profile.avatarInitials,
          role: user.role,
          isVerified: user.isVerified,
        },
        content: content.trim(),
        attachment: attachment || undefined,
        reactionCount: 0,
        commentCount: 0,
        isEdited: false,
        isPinned: Boolean(isPinned && (user.role === 'moderator' || user.role === 'admin')),
        createdAt: now,
        updatedAt: now,
      };

      await dbService.create<Post>('posts', newPost);
      set((state) => ({
        posts: [newPost, ...state.posts].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
        isPosting: false,
      }));
      return newPost;
    }
  },

  editPost: async (postId: string, newContent: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    const updated = await api.posts.edit(postId, newContent);
    set((state) => ({
      posts: state.posts.map((p) => (p.id === postId ? updated : p)),
    }));
  },

  deletePost: async (postId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    await api.posts.delete(postId);

    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
      reactions: state.reactions.filter((r) => r.postId !== postId),
      comments: { ...state.comments, [postId]: [] },
    }));
  },

  togglePinPost: async (postId: string) => {
    const updated = await api.posts.togglePin(postId);
    set((state) => ({
      posts: state.posts
        .map((p) => (p.id === postId ? updated : p))
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    }));
  },

  deleteComment: async (postId: string, commentId: string) => {
    try {
      await api.posts.deleteComment(postId, commentId);
    } catch {
      // ignore
    }
    set((state) => {
      const currentComments = state.comments[postId] || [];
      const filtered = currentComments.filter((c) => c.id !== commentId);
      const post = state.posts.find((p) => p.id === postId);
      const newCount = Math.max(0, (post?.commentCount || 1) - 1);
      return {
        comments: {
          ...state.comments,
          [postId]: filtered,
        },
        posts: state.posts.map((p) => (p.id === postId ? { ...p, commentCount: newCount } : p)),
      };
    });
  },

  toggleReaction: async (postId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to react');

    const res = await api.posts.toggleReaction(postId);

    set((state) => ({
      reactions: res.reacted
        ? [
            ...state.reactions,
            {
              id: `rx_${Date.now()}`,
              postId,
              userId: user.id,
              type: 'fire',
              createdAt: new Date().toISOString(),
            },
          ]
        : state.reactions.filter((r) => !(r.postId === postId && r.userId === user.id)),
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, reactionCount: res.reactionCount } : p
      ),
    }));
  },

  addComment: async (postId: string, content: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to reply');

    const cleanContent = content.trim();
    if (!cleanContent) throw new Error('Comment cannot be empty');

    const created = await api.posts.addComment(postId, cleanContent);
    set((state) => {
      const post = state.posts.find((p) => p.id === postId);
      const newCount = (post?.commentCount || 0) + 1;
      return {
        posts: state.posts.map((p) => (p.id === postId ? { ...p, commentCount: newCount } : p)),
        comments: {
          ...state.comments,
          [postId]: [...(state.comments[postId] || []), created],
        },
      };
    });
    return created;
  },

  hasReacted: (postId: string, userId?: string) => {
    const currentUserId = userId || useAuthStore.getState().user?.id;
    if (!currentUserId) return false;
    return get().reactions.some((r) => r.postId === postId && r.userId === currentUserId);
  },

  reset: () => {
    set({ posts: [], comments: {}, reactions: [], isLoading: false, isPosting: false });
  },
}));

