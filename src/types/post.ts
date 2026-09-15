export interface PostAttachment {
  type: 'image' | 'link';
  url: string;
  previewTitle?: string;
  previewDescription?: string;
}

export interface PostAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  avatarInitials: string;
  role?: 'member' | 'moderator' | 'admin';
  isVerified?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  author: PostAuthor;
  content: string; // Markdown or rich text string
  attachment?: PostAttachment;
  reactionCount: number; // Single 🔥 reaction count
  commentCount: number;
  isEdited: boolean;
  isPinned?: boolean;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: PostAuthor;
  content: string; // Supports @mentions
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  type: 'fire'; // Single reaction type per specification
  createdAt: string; // ISO-8601
}
