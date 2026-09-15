export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'post_reply'
  | 'post_reaction'
  | 'project_interest'
  | 'group_invitation';

export interface NotificationPayload {
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  actorAvatarInitials: string;
  targetId: string; // postId, connectionId, projectId, conversationId
  targetTitle?: string; // Post title/snippet, Project Name, Group Name
  messageSnippet?: string;
  deepLinkUrl: string; // e.g. "/common-space#post-123", "/projects/proj-456"
}

export interface InAppNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  payload: NotificationPayload;
  isRead: boolean;
  createdAt: string; // ISO-8601
}

export type SearchCategory = 'people' | 'projects' | 'posts';

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  avatarUrl?: string;
  avatarInitials?: string;
  tags?: string[];
  deepLinkUrl: string;
}

export interface GroupedSearchResults {
  people: SearchResultItem[];
  projects: SearchResultItem[];
  posts: SearchResultItem[];
  totalCount: number;
}
