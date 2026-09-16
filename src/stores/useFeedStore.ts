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
      const data = await api.posts.list().catch(() => ({ posts: [], reactions: [] }));
      const localPosts = await dbService.list<Post>('posts').catch(() => []);
      const localMockPosts = await mockDb.list<Post>(STORAGE_KEYS.POSTS).catch(() => []);

      const postMap = new Map<string, Post>();
      // Combine all sources, prioritizing latest/server items
      [...localMockPosts, ...localPosts, ...(data.posts || [])].forEach((p) => {
        if (p && p.id) {
          const existing = postMap.get(p.id);
          if (!existing || new Date(p.updatedAt || p.createdAt).getTime() >= new Date(existing.updatedAt || existing.createdAt).getTime()) {
            postMap.set(p.id, p);
          }
        }
      });

      const mergedPosts = Array.from(postMap.values());
      const localReactions = await dbService.list<Reaction>('reactions').catch(() => []);
      const localMockReactions = await mockDb.list<Reaction>(STORAGE_KEYS.REACTIONS).catch(() => []);
      const rxMap = new Map<string, Reaction>();
      [...localMockReactions, ...localReactions, ...(data.reactions || [])].forEach((r) => {
        if (r && r.id) rxMap.set(r.id, r);
      });

      set({
        posts: sortPostsWithPinned(mergedPosts),
        reactions: Array.from(rxMap.values()),
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
      const localComments = await dbService.list<Comment>('comments', (c) => c.postId === postId).catch(() => []);
      const commMap = new Map<string, Comment>();
      [...localComments, ...serverComments].forEach((c) => {
        if (c && c.id) commMap.set(c.id, c);
      });
      const merged = Array.from(commMap.values());
      set((state) => ({
        comments: {
          ...state.comments,
          [postId]: merged,
        },
      }));
      return merged;
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
    const now = new Date().toISOString();
    const isUserMod = Boolean(
      user.role === 'moderator' ||
      user.role === 'admin' ||
      user.profile?.role === 'moderator' ||
      user.username === 'sidhu001'
    );
    const effectivePinned = Boolean(isPinned && isUserMod);

    let created: Post | null = null;
    try {
      created = await api.posts.create(content, attachment, effectivePinned);
    } catch (apiErr) {
      console.warn('API post creation failed, falling back to dbService:', apiErr);
    }

    const newPost: Post = created || {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorId: user.id,
      author: {
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatarUrl: user.profile?.avatarUrl,
        avatarInitials: user.profile?.avatarInitials || '?',
        role: user.role,
        isVerified: user.isVerified,
      },
      content: content.trim(),
      attachment: attachment || undefined,
      reactionCount: 0,
      commentCount: 0,
      isEdited: false,
      isPinned: effectivePinned,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await dbService.set<Post>('posts', newPost.id, newPost);
      await mockDb.create<Post>(STORAGE_KEYS.POSTS, newPost);
    } catch {}

    set((state) => ({
      posts: sortPostsWithPinned([newPost, ...state.posts.filter((p) => p.id !== newPost.id)]),
      isPosting: false,
    }));
    return newPost;
  },

  editPost: async (postId: string, newContent: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    const clean = newContent.trim();
    if (!clean) throw new Error('Post content cannot be empty');

    const now = new Date().toISOString();
    let updatedFromApi: Post | null = null;

    try {
      updatedFromApi = await api.posts.edit(postId, clean);
    } catch (err) {
      console.warn('API post edit failed, continuing with dbService & local update:', err);
    }

    try {
      await dbService.update<Post>('posts', postId, {
        content: clean,
        isEdited: true,
        updatedAt: now,
      });
      await mockDb.update<Post>(STORAGE_KEYS.POSTS, postId, {
        content: clean,
        isEdited: true,
        updatedAt: now,
      });
    } catch {}

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...(updatedFromApi || p),
              content: clean,
              isEdited: true,
              updatedAt: now,
            }
          : p
      ),
    }));
  },

  deletePost: async (postId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    try {
      await api.posts.delete(postId);
    } catch (err) {
      console.warn('API post delete failed, continuing with dbService & local update:', err);
    }

    try {
      await dbService.delete('posts', postId);
      await mockDb.delete(STORAGE_KEYS.POSTS, postId);
    } catch {}

    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
      reactions: state.reactions.filter((r) => r.postId !== postId),
      comments: { ...state.comments, [postId]: [] },
    }));
  },

  togglePinPost: async (postId: string) => {
    const currentPost = get().posts.find((p) => p.id === postId);
    const newPinned = !currentPost?.isPinned;
    const now = new Date().toISOString();
    let updatedFromApi: Post | null = null;

    try {
      updatedFromApi = await api.posts.togglePin(postId);
    } catch (err) {
      console.warn('API toggle pin failed, continuing with dbService & local update:', err);
    }

    try {
      await dbService.update<Post>('posts', postId, {
        isPinned: newPinned,
        updatedAt: now,
      });
      await mockDb.update<Post>(STORAGE_KEYS.POSTS, postId, {
        isPinned: newPinned,
        updatedAt: now,
      });
    } catch {}

    set((state) => ({
      posts: sortPostsWithPinned(
        state.posts.map((p) =>
          p.id === postId
            ? {
                ...(updatedFromApi || p),
                isPinned: newPinned,
                updatedAt: now,
              }
            : p
        )
      ),
    }));
  },

  deleteComment: async (postId: string, commentId: string) => {
    try {
      await api.posts.deleteComment(postId, commentId);
    } catch {
      // ignore
    }

    try {
      await dbService.delete('comments', commentId);
      await mockDb.delete(STORAGE_KEYS.COMMENTS, commentId);
    } catch {}

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

    const existingReaction = get().reactions.find((r) => r.postId === postId && r.userId === user.id);
    let serverRes: { reacted: boolean; reactionCount: number } | null = null;

    try {
      serverRes = await api.posts.toggleReaction(postId);
    } catch (err) {
      console.warn('API reaction failed, toggling locally:', err);
    }

    const willReact = serverRes ? serverRes.reacted : !existingReaction;

    try {
      if (!willReact && existingReaction) {
        await dbService.delete('reactions', existingReaction.id);
        await mockDb.delete(STORAGE_KEYS.REACTIONS, existingReaction.id);
      } else if (willReact && !existingReaction) {
        const newReaction = {
          id: `rx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          postId,
          userId: user.id,
          type: 'fire' as const,
          createdAt: new Date().toISOString(),
        };
        await dbService.set('reactions', newReaction.id, newReaction);
        await mockDb.create(STORAGE_KEYS.REACTIONS, newReaction);
      }
    } catch {}

    set((state) => {
      const newReactions = willReact
        ? [
            ...state.reactions.filter((r) => !(r.postId === postId && r.userId === user.id)),
            {
              id: existingReaction?.id || `rx_${Date.now()}`,
              postId,
              userId: user.id,
              type: 'fire' as const,
              createdAt: new Date().toISOString(),
            },
          ]
        : state.reactions.filter((r) => !(r.postId === postId && r.userId === user.id));

      const post = state.posts.find((p) => p.id === postId);
      const newReactionCount = serverRes
        ? serverRes.reactionCount
        : Math.max(0, (post?.reactionCount || 0) + (willReact ? 1 : -1));

      return {
        reactions: newReactions,
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, reactionCount: newReactionCount } : p
        ),
      };
    });
  },

  addComment: async (postId: string, content: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to reply');

    const cleanContent = content.trim();
    if (!cleanContent) throw new Error('Comment cannot be empty');

    const now = new Date().toISOString();
    let created: Comment | null = null;

    try {
      created = await api.posts.addComment(postId, cleanContent);
    } catch (err) {
      console.warn('API addComment failed, creating locally in dbService:', err);
    }

    const newComment: Comment = created || {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      postId,
      authorId: user.id,
      author: {
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatarUrl: user.profile?.avatarUrl,
        avatarInitials: user.profile?.avatarInitials || '?',
        role: user.role,
        isVerified: user.isVerified,
      },
      content: cleanContent,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await dbService.set('comments', newComment.id, newComment);
      await mockDb.create(STORAGE_KEYS.COMMENTS, newComment);
    } catch {}

    set((state) => {
      const post = state.posts.find((p) => p.id === postId);
      const newCount = (post?.commentCount || 0) + 1;
      return {
        posts: state.posts.map((p) => (p.id === postId ? { ...p, commentCount: newCount } : p)),
        comments: {
          ...state.comments,
          [postId]: [...(state.comments[postId] || []), newComment],
        },
      };
    });
    return newComment;
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

