export type ProjectMemberRole = 'owner' | 'contributor';

export interface ProjectMember {
  userId: string;
  role: ProjectMemberRole;
  joinedAt: string; // ISO-8601
}

export interface ProjectExternalLink {
  type: 'github' | 'demo' | 'docs' | 'website' | 'other';
  label: string;
  url: string;
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  authorId: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string; // ISO-8601
}

export interface ProjectDiscussion {
  id: string;
  projectId: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    avatarInitials: string;
  };
  content: string;
  createdAt: string; // ISO-8601
}

export interface Project {
  id: string;
  name: string;
  tagline: string; // "What are you building?" short summary
  description: string; // Detailed narrative
  coverImageUrl?: string;
  ownerId: string;
  team: ProjectMember[];
  lookingForTags: string[]; // e.g. ["#frontend", "#ui-ux", "#smart-contracts"]
  links: ProjectExternalLink[];
  updatesCount: number;
  discussionCount: number;
  interestCount: number;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export type InterestStatus = 'submitted' | 'reviewed' | 'contacted';

export interface ProjectInterest {
  id: string;
  projectId: string;
  userId: string;
  applicant: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    avatarInitials: string;
  };
  message?: string; // Optional pitch / statement of interest
  status: InterestStatus;
  createdAt: string; // ISO-8601
}
