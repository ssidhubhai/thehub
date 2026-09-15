import { create } from 'zustand';
import { Post, Comment, Reaction, PostAttachment } from '@/types/post';
import { mockDb, STORAGE_KEYS } from '@/lib/firebase/mock/mockDb';
import { useAuthStore } from './useAuthStore';
import { InAppNotification } from '@/types/notification';
import { api } from '@/lib/api';

export interface FeedState {
  posts: Post[];
  comments: Record<string, Comment[]>;
  reactions: Reaction[];
  isLoading: boolean;
  isPosting: boolean;

  fetchPosts: () => Promise<void>;
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

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  comments: {},
  reactions: [],
  isLoading: false,
  isPosting: false,

  fetchPosts: async () => {
    set({ isLoading: true });
    try {
      const data = await api.posts.list();
      set({
        posts: data.posts,
        reactions: data.reactions || [],
        isLoading: false,
      });
    } catch {
      try {
        mockDb.ensureInitialized();
        const [allPosts, allReactions, allComments] = await Promise.all([
          mockDb.list<Post>(STORAGE_KEYS.POSTS),
          mockDb.list<Reaction>(STORAGE_KEYS.REACTIONS),
          mockDb.list<Comment>(STORAGE_KEYS.COMMENTS),
        ]);

        const sortedPosts = [...allPosts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const commentMap: Record<string, Comment[]> = {};
        allComments.forEach((c) => {
          if (!commentMap[c.postId]) commentMap[c.postId] = [];
          commentMap[c.postId].push(c);
        });

        set({
          posts: sortedPosts,
          reactions: allReactions,
          comments: commentMap,
          isLoading: false,
        });
      } catch (err) {
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
      const allComments = await mockDb.list<Comment>(
        STORAGE_KEYS.COMMENTS,
        (c) => c.postId === postId
      );
      const sorted = [...allComments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      set((state) => ({
        comments: {
          ...state.comments,
          [postId]: sorted,
        },
      }));

      return sorted;
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
    } catch (apiErr: any) {
      console.warn('API post creation failed, falling back to local database:', apiErr);
      const now = new Date().toISOString();
      const newPostData: Omit<Post, 'id'> = {
        authorId: user.id,
        author: {
          id: user.id,
          username: user.username,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          avatarInitials: user.profile.avatarInitials,
          role: user.role || user.profile?.role,
          isVerified: user.isVerified || user.profile?.isVerified,
        },
        content: content.trim(),
        attachment,
        reactionCount: 0,
        commentCount: 0,
        isEdited: false,
        isPinned: Boolean(isPinned),
        createdAt: now,
        updatedAt: now,
      };

      try {
        const created = await mockDb.create<Post>(STORAGE_KEYS.POSTS, newPostData as any);
        set((state) => ({
          posts: [created, ...state.posts].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }),
          isPosting: false,
        }));
        return created;
      } catch (err) {
        set({ isPosting: false });
        throw err;
      }
    }
  },

  editPost: async (postId: string, newContent: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    try {
      const updated = await api.posts.edit(postId, newContent);
      set((state) => ({
        posts: state.posts.map((p) => (p.id === postId ? updated : p)),
      }));
    } catch {
      const post = await mockDb.get<Post>(STORAGE_KEYS.POSTS, postId);
      if (!post || post.authorId !== user.id) {
        throw new Error('Unauthorized to edit this post');
      }

      const now = new Date().toISOString();
      await mockDb.update<Post>(STORAGE_KEYS.POSTS, postId, {
        content: newContent.trim(),
        isEdited: true,
        updatedAt: now,
      });

      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, content: newContent.trim(), isEdited: true, updatedAt: now } : p
        ),
      }));
    }
  },

  deletePost: async (postId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in');

    try {
      await api.posts.delete(postId);
    } catch {
      const post = await mockDb.get<Post>(STORAGE_KEYS.POSTS, postId);
      if (!post || post.authorId !== user.id) {
        throw new Error('Unauthorized to delete this post');
      }

      await mockDb.delete(STORAGE_KEYS.POSTS, postId);

      const reactions = await mockDb.list<Reaction>(STORAGE_KEYS.REACTIONS);
      for (const rx of reactions.filter((r) => r.postId === postId)) {
        await mockDb.delete(STORAGE_KEYS.REACTIONS, rx.id);
      }
      const comments = await mockDb.list<Comment>(STORAGE_KEYS.COMMENTS);
      for (const cm of comments.filter((c) => c.postId === postId)) {
        await mockDb.delete(STORAGE_KEYS.COMMENTS, cm.id);
      }
    }

    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
      reactions: state.reactions.filter((r) => r.postId !== postId),
      comments: { ...state.comments, [postId]: [] },
    }));
  },

  togglePinPost: async (postId: string) => {
    try {
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
    } catch {
      const post = await mockDb.get<Post>(STORAGE_KEYS.POSTS, postId);
      if (post) {
        const nextPinned = !post.isPinned;
        await mockDb.update<Post>(STORAGE_KEYS.POSTS, postId, { isPinned: nextPinned });
        set((state) => ({
          posts: state.posts
            .map((p) => (p.id === postId ? { ...p, isPinned: nextPinned } : p))
            .sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }),
        }));
      }
    }
  },

  deleteComment: async (postId: string, commentId: string) => {
    try {
      await api.posts.deleteComment(postId, commentId);
    } catch {
      await mockDb.delete(STORAGE_KEYS.COMMENTS, commentId);
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

    try {
      const res = await api.posts.toggleReaction(postId);
      const { reactions } = get();
      const existing = reactions.find((r) => r.postId === postId && r.userId === user.id);

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
    } catch {
      const { reactions, posts } = get();
      const existing = reactions.find((r) => r.postId === postId && r.userId === user.id);

      if (existing) {
        await mockDb.delete(STORAGE_KEYS.REACTIONS, existing.id);
        const post = posts.find((p) => p.id === postId);
        const newCount = Math.max(0, (post?.reactionCount || 1) - 1);
        await mockDb.update<Post>(STORAGE_KEYS.POSTS, postId, { reactionCount: newCount });

        set((state) => ({
          reactions: state.reactions.filter((r) => r.id !== existing.id),
          posts: state.posts.map((p) => (p.id === postId ? { ...p, reactionCount: newCount } : p)),
        }));
      } else {
        const newReaction: Omit<Reaction, 'id'> = {
          postId,
          userId: user.id,
          type: 'fire',
          createdAt: new Date().toISOString(),
        };
        const created = await mockDb.create<Reaction>(STORAGE_KEYS.REACTIONS, newReaction as any);
        const post = posts.find((p) => p.id === postId);
        const newCount = (post?.reactionCount || 0) + 1;
        await mockDb.update<Post>(STORAGE_KEYS.POSTS, postId, { reactionCount: newCount });

        set((state) => ({
          reactions: [...state.reactions, created],
          posts: state.posts.map((p) => (p.id === postId ? { ...p, reactionCount: newCount } : p)),
        }));

        if (post && post.authorId !== user.id) {
          const notif: Omit<InAppNotification, 'id'> = {
            recipientId: post.authorId,
            type: 'post_reaction',
            payload: {
              actorId: user.id,
              actorName: user.profile.displayName,
              actorAvatarUrl: user.profile.avatarUrl,
              actorAvatarInitials: user.profile.avatarInitials,
              targetId: postId,
              targetTitle: post.content.slice(0, 50) + (post.content.length > 50 ? '...' : ''),
              messageSnippet: 'reacted 🔥 to your post',
              deepLinkUrl: `/common-space?post=${postId}`,
            },
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          await mockDb.create<InAppNotification>(STORAGE_KEYS.NOTIFICATIONS, notif as any);
        }
      }
    }
  },

  addComment: async (postId: string, content: string) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Must be signed in to reply');

    const cleanContent = content.trim();
    if (!cleanContent) throw new Error('Comment cannot be empty');

    try {
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
    } catch {
      const now = new Date().toISOString();
      const newCommentData: Omit<Comment, 'id'> = {
        postId,
        authorId: user.id,
        author: {
          id: user.id,
          username: user.username,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          avatarInitials: user.profile.avatarInitials,
        },
        content: cleanContent,
        createdAt: now,
        updatedAt: now,
      };

      const created = await mockDb.create<Comment>(STORAGE_KEYS.COMMENTS, newCommentData as any);

      const post = get().posts.find((p) => p.id === postId);
      const newCount = (post?.commentCount || 0) + 1;
      await mockDb.update<Post>(STORAGE_KEYS.POSTS, postId, { commentCount: newCount });

      set((state) => ({
        posts: state.posts.map((p) => (p.id === postId ? { ...p, commentCount: newCount } : p)),
        comments: {
          ...state.comments,
          [postId]: [...(state.comments[postId] || []), created],
        },
      }));

      if (post && post.authorId !== user.id) {
        const notif: Omit<InAppNotification, 'id'> = {
          recipientId: post.authorId,
          type: 'post_reply',
          payload: {
            actorId: user.id,
            actorName: user.profile.displayName,
            actorAvatarUrl: user.profile.avatarUrl,
            actorAvatarInitials: user.profile.avatarInitials,
            targetId: postId,
            targetTitle: post.content.slice(0, 50) + (post.content.length > 50 ? '...' : ''),
            messageSnippet: cleanContent.slice(0, 80),
            deepLinkUrl: `/common-space?post=${postId}`,
          },
          isRead: false,
          createdAt: now,
        };
        await mockDb.create<InAppNotification>(STORAGE_KEYS.NOTIFICATIONS, notif as any);
      }

      return created;
    }
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

