import { User } from '@/types/user';
import { Post, Comment, Reaction } from '@/types/post';
import { Project, ProjectDiscussion, ProjectUpdate } from '@/types/project';
import { Conversation, Message } from '@/types/message';
import { InAppNotification } from '@/types/notification';
import { Connection } from '@/types/common';

export const SEED_USERS: User[] = [
  {
    id: 'user_sidhu001',
    username: 'sidhu001',
    passwordHash: 'a385751d4e446a8c4f6bdf6c8f89c41c2d4971cb11a8f6aa6b094a21fe9628de',
    role: 'moderator',
    isVerified: true,
    profile: {
      displayName: 'Sidhu',
      bio: 'The Hub Community Lead & Moderator. Reach out anytime if you need help, project guidance, or community support!',
      avatarUrl: '', // Default profile picture has no image; falls back to initials everywhere
      avatarInitials: 'S',
      interests: ['Community', 'Mentorship', 'Full Stack', 'AI', 'Open Source'],
      currentlyLearning: 'Scaling builder communities & developer platforms',
      currentlyBuilding: 'The Hub — community platform for young builders',
      joinedAt: '2026-01-01T00:00:00.000Z',
      isOnboarded: true,
      role: 'moderator',
      isVerified: true,
    },
    presence: {
      status: 'online',
      lastActiveAt: new Date().toISOString(),
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

export const SEED_POSTS: Post[] = [];
export const SEED_COMMENTS: Comment[] = [];
export const SEED_REACTIONS: Reaction[] = [];
export const SEED_PROJECTS: Project[] = [];
export const SEED_PROJECT_UPDATES: ProjectUpdate[] = [];
export const SEED_PROJECT_DISCUSSIONS: ProjectDiscussion[] = [];
export const SEED_CONNECTIONS: Connection[] = [];
export const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_general',
    type: 'general',
    title: 'The Hub — General Community',
    description: 'Public common space for all builders and members of The Hub to hang out, share ideas, and talk!',
    participantIds: ['user_sidhu001'],
    unreadCounts: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastMessage: {
      senderId: 'user_sidhu001',
      senderDisplayName: 'Sidhu',
      content: 'Welcome everyone to The Hub! Feel free to introduce yourself, share what you are building, or ask any questions.',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  },
];

export const SEED_MESSAGES: Message[] = [
  {
    id: 'msg_welcome_001',
    conversationId: 'conv_general',
    senderId: 'user_sidhu001',
    sender: {
      id: 'user_sidhu001',
      username: 'sidhu001',
      displayName: 'Sidhu',
      avatarUrl: '',
      avatarInitials: 'S',
    },
    content: 'Welcome everyone to The Hub! Feel free to introduce yourself, share what you are building, or ask any questions.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
export const SEED_NOTIFICATIONS: InAppNotification[] = [];
