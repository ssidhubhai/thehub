export type ConversationType = 'direct' | 'general' | 'custom_group' | 'project_group';

export interface ConversationParticipant {
  userId: string;
  lastReadAt?: string; // ISO-8601 for unread badges
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title?: string; // For groups or project chats (e.g. "The Hub — General")
  description?: string;
  projectId?: string; // If linked to a project team chat
  participantIds: string[]; // List of user IDs
  lastMessage?: {
    senderId: string;
    senderDisplayName: string;
    content: string;
    createdAt: string; // ISO-8601
  };
  unreadCounts: Record<string, number>; // userId -> unread count
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    avatarInitials: string;
  };
  content: string;
  imageUrl?: string;
  quotedMessageId?: string;
  isEdited?: boolean;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}
