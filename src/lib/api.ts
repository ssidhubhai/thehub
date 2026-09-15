import { User, UserProfile } from '@/types/user';
import { Post, Comment, PostAttachment } from '@/types/post';
import { Project, ProjectUpdate, ProjectDiscussion, ProjectInterest } from '@/types/project';
import { Conversation, Message } from '@/types/message';
import { InAppNotification } from '@/types/notification';
import { Connection } from '@/types/common';

const TOKEN_KEY = 'thehub_auth_token';

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('thehub_auth_session');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    const user = getStoredUser();
    if (user) {
      token = `token_${user.id}_${user.username}`;
      localStorage.setItem(TOKEN_KEY, token);
    }
  }
  return token;
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const user = getStoredUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-username'] = user.username;
    try {
      headers['x-user-data'] = encodeURIComponent(JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData?.error) {
        errorMsg = errorData.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    register: async (username: string, password?: string, displayName?: string) => {
      const data = await request<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, displayName }),
      });
      setStoredToken(data.token);
      return data;
    },
    login: async (username: string, password?: string) => {
      const data = await request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setStoredToken(data.token);
      return data;
    },
    logout: async () => {
      try {
        await request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
      } finally {
        setStoredToken(null);
      }
    },
    getMe: async () => {
      return request<{ user: User; token: string }>('/api/auth/me');
    },
    updateProfile: async (partial: Partial<UserProfile>) => {
      return request<{ user: User }>('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(partial),
      });
    },
  },

  users: {
    list: async (params?: { search?: string; tag?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.tag) query.set('tag', params.tag);
      return request<User[]>(`/api/users?${query.toString()}`);
    },
    get: async (id: string) => {
      return request<User>(`/api/users/${id}`);
    },
    updatePresence: async (status: 'online' | 'away' | 'offline') => {
      return request<{ presence: User['presence'] }>('/api/users/presence', {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  },

  connections: {
    list: async () => {
      return request<Connection[]>('/api/connections');
    },
    request: async (recipientId: string) => {
      return request<Connection>('/api/connections', {
        method: 'POST',
        body: JSON.stringify({ recipientId }),
      });
    },
    accept: async (connectionId: string) => {
      return request<Connection>(`/api/connections/${connectionId}/accept`, {
        method: 'PATCH',
      });
    },
    decline: async (connectionId: string) => {
      return request<Connection>(`/api/connections/${connectionId}/decline`, {
        method: 'PATCH',
      });
    },
  },

  posts: {
    list: async (params?: { authorId?: string }) => {
      const query = new URLSearchParams();
      if (params?.authorId) query.set('authorId', params.authorId);
      return request<{ posts: Post[]; reactions: any[] }>(`/api/posts?${query.toString()}`);
    },
    create: async (content: string, attachment?: PostAttachment, isPinned?: boolean) => {
      return request<Post>('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content, attachment, isPinned }),
      });
    },
    edit: async (postId: string, content: string) => {
      return request<Post>(`/api/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
    },
    delete: async (postId: string) => {
      return request<{ success: boolean }>(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
    },
    togglePin: async (postId: string) => {
      return request<Post>(`/api/posts/${postId}/pin`, {
        method: 'PATCH',
      });
    },
    toggleReaction: async (postId: string) => {
      return request<{ reacted: boolean; reactionCount: number }>(`/api/posts/${postId}/react`, {
        method: 'POST',
      });
    },
    listComments: async (postId: string) => {
      return request<Comment[]>(`/api/posts/${postId}/comments`);
    },
    addComment: async (postId: string, content: string) => {
      return request<Comment>(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    deleteComment: async (postId: string, commentId: string) => {
      return request<{ success: boolean }>(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      });
    },
  },

  projects: {
    list: async (params?: { search?: string; tag?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.tag) query.set('tag', params.tag);
      return request<Project[]>(`/api/projects?${query.toString()}`);
    },
    get: async (id: string) => {
      return request<{
        project: Project;
        updates: ProjectUpdate[];
        discussions: ProjectDiscussion[];
        interests: ProjectInterest[];
      }>(`/api/projects/${id}`);
    },
    create: async (data: {
      name: string;
      tagline: string;
      description?: string;
      lookingForTags?: string[];
      links?: any[];
      coverImageUrl?: string;
    }) => {
      return request<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, partial: Partial<Project>) => {
      return request<Project>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(partial),
      });
    },
    delete: async (id: string) => {
      return request<{ success: boolean }>(`/api/projects/${id}`, {
        method: 'DELETE',
      });
    },
    addUpdate: async (
      projectId: string,
      dataOrTitle: { title: string; content: string; imageUrl?: string } | string,
      content?: string,
      imageUrl?: string
    ) => {
      const body =
        typeof dataOrTitle === 'string'
          ? { title: dataOrTitle, content: content || '', imageUrl }
          : dataOrTitle;
      return request<ProjectUpdate>(`/api/projects/${projectId}/updates`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    addDiscussion: async (projectId: string, content: string) => {
      return request<ProjectDiscussion>(`/api/projects/${projectId}/discussions`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    listInterests: async (projectId?: string) => {
      const query = new URLSearchParams();
      if (projectId) query.set('projectId', projectId);
      return request<ProjectInterest[]>(`/api/projects/interests?${query.toString()}`);
    },
    expressInterest: async (projectId: string, message?: string) => {
      return request<ProjectInterest>(`/api/projects/${projectId}/interest`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    },
    updateInterest: async (projectId: string, interestId: string, status: string) => {
      return request<ProjectInterest>(`/api/projects/${projectId}/interest/${interestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  },

  conversations: {
    list: async () => {
      return request<Conversation[]>('/api/conversations');
    },
    createDirect: async (targetUserId: string) => {
      return request<Conversation>('/api/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
    },
    createGroup: async (
      titleOrData: string | { title: string; description?: string; participantIds: string[] },
      participantIds?: string[],
      description?: string
    ) => {
      const body =
        typeof titleOrData === 'string'
          ? { title: titleOrData, participantIds: participantIds || [], description }
          : titleOrData;
      return request<Conversation>('/api/conversations/group', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    listMessages: async (conversationId: string) => {
      return request<Message[]>(`/api/conversations/${conversationId}/messages`);
    },
    sendMessage: async (conversationId: string, content: string, quotedMessageId?: string, imageUrl?: string) => {
      return request<Message>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, quotedMessageId, imageUrl }),
      });
    },
    editMessage: async (conversationId: string, messageId: string, content: string) => {
      return request<Message>(`/api/conversations/${conversationId}/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
    },
    deleteMessage: async (conversationId: string, messageId: string) => {
      return request<{ success: boolean; messageId: string }>(`/api/conversations/${conversationId}/messages/${messageId}`, {
        method: 'DELETE',
      });
    },
    markRead: async (conversationId: string) => {
      return request<{ success: boolean }>(`/api/conversations/${conversationId}/read`, {
        method: 'PATCH',
      });
    },
  },

  notifications: {
    list: async () => {
      return request<InAppNotification[]>('/api/notifications');
    },
    markRead: async (id: string) => {
      return request<{ success: boolean }>(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
    },
    markAllRead: async () => {
      return request<{ success: boolean }>('/api/notifications/read-all', {
        method: 'PATCH',
      });
    },
  },

  search: async (query: string) => {
    return request<{
      people: any[];
      projects: any[];
      posts: any[];
      totalCount: number;
    }>(`/api/search?q=${encodeURIComponent(query)}`);
  },

  admin: {
    reset: async () => {
      return request<{ success: boolean; message: string }>('/api/admin/reset', {
        method: 'POST',
      });
    },
  },
};
