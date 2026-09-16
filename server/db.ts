import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, UserProfile } from '../src/types/user';
import { Post, Comment, Reaction, PostAttachment } from '../src/types/post';
import {
  Project,
  ProjectUpdate,
  ProjectDiscussion,
  ProjectInterest,
  ProjectMember,
  ProjectExternalLink,
} from '../src/types/project';
import { Conversation, Message } from '../src/types/message';
import { InAppNotification, NotificationPayload, NotificationType } from '../src/types/notification';
import { Connection, ConnectionStatus } from '../src/types/common';
import {
  SEED_USERS,
  SEED_POSTS,
  SEED_COMMENTS,
  SEED_REACTIONS,
  SEED_PROJECTS,
  SEED_PROJECT_UPDATES,
  SEED_PROJECT_DISCUSSIONS,
  SEED_CONVERSATIONS,
  SEED_MESSAGES,
  SEED_CONNECTIONS,
  SEED_NOTIFICATIONS,
} from '../src/lib/firebase/mock/seedData';

export interface HubDatabaseSchema {
  users: User[];
  posts: Post[];
  comments: Comment[];
  reactions: Reaction[];
  projects: Project[];
  projectUpdates: ProjectUpdate[];
  projectDiscussions: ProjectDiscussion[];
  projectInterests: ProjectInterest[];
  connections: Connection[];
  conversations: Conversation[];
  messages: Message[];
  notifications: InAppNotification[];
  sessions: Record<string, string>; // token -> userId
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'hub_database.json');

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`thehub_salt_${password}`).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

class DatabaseManager {
  private data: HubDatabaseSchema;

  constructor() {
    this.data = this.loadOrInitialize();
  }

  private loadOrInitialize(): HubDatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as HubDatabaseSchema;
        // If the database contains dummy mock users like maya_lin or alex_river, purge them
        if (parsed.users && parsed.users.some((u) => u.username === 'maya_lin' || u.username === 'alex_river')) {
          const fresh = this.getSeedSchema();
          this.ensureLeadAccount(fresh);
          this.persist(fresh);
          return fresh;
        }
        this.ensureLeadAccount(parsed);
        this.persist(parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('Failed to load existing database file, rebuilding from seed data:', err);
    }

    const initial = this.getSeedSchema();
    this.ensureLeadAccount(initial);
    this.persist(initial);
    return initial;
  }

  private ensureLeadAccount(schema: HubDatabaseSchema): void {
    const sidhuPasswordHash = hashPassword('rajvi00775');
    const existingIndex = schema.users.findIndex((u) => u.username === 'sidhu001');
    const now = new Date().toISOString();

    const leadUser: User = {
      id: 'user_sidhu001',
      username: 'sidhu001',
      passwordHash: sidhuPasswordHash,
      role: 'moderator',
      isVerified: true,
      profile: {
        displayName: 'Sidhu',
        bio: 'The Hub Community Lead & Moderator. Reach out anytime if you need help, project guidance, or community support!',
        avatarUrl: '', // Default profile picture has no image; falls back to initials
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
        lastActiveAt: now,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      schema.users[existingIndex] = {
        ...schema.users[existingIndex],
        passwordHash: sidhuPasswordHash,
        role: 'moderator',
        isVerified: true,
        profile: {
          ...schema.users[existingIndex].profile,
          displayName: schema.users[existingIndex].profile.displayName || 'Sidhu',
          avatarInitials: schema.users[existingIndex].profile.avatarInitials || 'S',
          role: 'moderator',
          isVerified: true,
        },
      };
    } else {
      schema.users.unshift(leadUser);
    }

    // Ensure general community chat room exists
    if (!schema.conversations) {
      schema.conversations = [];
    }
    const generalIdx = schema.conversations.findIndex((c) => c.id === 'conv_general' || c.type === 'general');
    if (generalIdx === -1) {
      schema.conversations.unshift({
        id: 'conv_general',
        type: 'general',
        title: 'The Hub — General Community',
        description: 'Public common space for all builders and members of The Hub to hang out, share ideas, and talk!',
        participantIds: ['user_sidhu001'],
        unreadCounts: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: now,
        lastMessage: {
          senderId: 'user_sidhu001',
          senderDisplayName: 'Sidhu',
          content: 'Welcome everyone to The Hub! Feel free to introduce yourself, share what you are building, or ask any questions.',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      });
    }

    if (!schema.messages) {
      schema.messages = [];
    }
    const hasGeneralMsg = schema.messages.some((m) => m.conversationId === 'conv_general');
    if (!hasGeneralMsg) {
      schema.messages.unshift({
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
      });
    }
  }

  private getSeedSchema(): HubDatabaseSchema {
    // Only sidhu001 is preserved; all other dummy users, posts, and projects are purged
    const sidhuPasswordHash = hashPassword('rajvi00775');
    const now = new Date().toISOString();

    const sidhuUser: User = {
      id: 'user_sidhu001',
      username: 'sidhu001',
      passwordHash: sidhuPasswordHash,
      role: 'moderator',
      isVerified: true,
      profile: {
        displayName: 'Sidhu',
        bio: 'The Hub Community Lead & Moderator. Reach out anytime if you need help, project guidance, or community support!',
        avatarUrl: '', // Initial fallback by default
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
        lastActiveAt: now,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: now,
    };

    const generalConversation: Conversation = {
      id: 'conv_general',
      type: 'general',
      title: 'The Hub — General Community',
      description: 'Public common space for all builders and members of The Hub to hang out, share ideas, and talk!',
      participantIds: ['user_sidhu001'],
      unreadCounts: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: now,
      lastMessage: {
        senderId: 'user_sidhu001',
        senderDisplayName: 'Sidhu',
        content: 'Welcome everyone to The Hub! Feel free to introduce yourself, share what you are building, or ask any questions.',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const welcomeMessage: Message = {
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
    };

    return {
      users: [sidhuUser],
      posts: [],
      comments: [],
      reactions: [],
      projects: [],
      projectUpdates: [],
      projectDiscussions: [],
      projectInterests: [],
      connections: [],
      conversations: [generalConversation],
      messages: [welcomeMessage],
      notifications: [],
      sessions: {},
    };
  }

  public persist(schema?: HubDatabaseSchema): void {
    const toWrite = schema || this.data;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(toWrite, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public resetToSeed(): HubDatabaseSchema {
    this.data = this.getSeedSchema();
    this.persist();
    return this.data;
  }

  // --- Auth & Users ---
  public findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByUsername(username: string): User | undefined {
    const clean = username.trim().toLowerCase();
    return this.data.users.find((u) => u.username.toLowerCase() === clean);
  }

  public findUserByToken(token: string): User | undefined {
    const userId = this.data.sessions[token];
    if (!userId) return undefined;
    return this.findUserById(userId);
  }

  public createSession(userId: string): string {
    const token = generateToken();
    this.data.sessions[token] = userId;
    this.persist();
    return token;
  }

  public createSessionWithToken(token: string, userId: string): void {
    if (!token || !userId) return;
    this.data.sessions[token] = userId;
    this.persist();
  }

  public removeSession(token: string): void {
    delete this.data.sessions[token];
    this.persist();
  }

  public createUser(user: User): User {
    this.data.users.unshift(user);
    // Auto add to general conversation
    const generalConv = this.data.conversations.find((c) => c.id === 'conv_general');
    if (generalConv && !generalConv.participantIds.includes(user.id)) {
      generalConv.participantIds.push(user.id);
    }
    this.persist();
    return user;
  }

  public updateUser(userId: string, partial: Partial<User>): User | undefined {
    const user = this.findUserById(userId);
    if (!user) return undefined;

    if (partial.profile) {
      user.profile = { ...user.profile, ...partial.profile };
    }
    if (partial.presence) {
      user.presence = { ...user.presence, ...partial.presence };
    }
    if (partial.passwordHash) {
      user.passwordHash = partial.passwordHash;
    }
    if (partial.role !== undefined) {
      user.role = partial.role;
      if (user.profile) user.profile.role = partial.role;
    }
    if (partial.isVerified !== undefined) {
      user.isVerified = partial.isVerified;
      if (user.profile) user.profile.isVerified = partial.isVerified;
    }
    if (partial.moderationStatus !== undefined) {
      user.moderationStatus = partial.moderationStatus;
    }
    if (partial.moderationReason !== undefined) {
      user.moderationReason = partial.moderationReason;
    }
    user.updatedAt = new Date().toISOString();

    this.persist();
    return user;
  }

  public listUsers(searchQuery?: string, tag?: string): User[] {
    let result = [...this.data.users];
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.profile.displayName.toLowerCase().includes(q) ||
          u.profile.bio.toLowerCase().includes(q) ||
          u.profile.interests.some((i) => i.toLowerCase().includes(q)) ||
          u.profile.currentlyBuilding.toLowerCase().includes(q) ||
          u.profile.currentlyLearning.toLowerCase().includes(q)
      );
    }
    if (tag) {
      const t = tag.toLowerCase().trim();
      result = result.filter((u) => u.profile.interests.some((i) => i.toLowerCase() === t));
    }
    return result;
  }

  // --- Posts, Comments & Reactions ---
  public listPosts(authorId?: string): Post[] {
    let list = [...this.data.posts];
    if (authorId) {
      list = list.filter((p) => p.authorId === authorId);
    }
    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  public getPost(id: string): Post | undefined {
    return this.data.posts.find((p) => p.id === id);
  }

  public createPost(post: Post): Post {
    this.data.posts.unshift(post);
    this.persist();
    return post;
  }

  public updatePost(id: string, partial: Partial<Post>): Post | undefined {
    const post = this.getPost(id);
    if (!post) return undefined;
    Object.assign(post, partial, { updatedAt: new Date().toISOString() });
    this.persist();
    return post;
  }

  public deletePost(id: string): boolean {
    const idx = this.data.posts.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.data.posts.splice(idx, 1);
    // Cascade delete comments and reactions
    this.data.comments = this.data.comments.filter((c) => c.postId !== id);
    this.data.reactions = this.data.reactions.filter((r) => r.postId !== id);
    this.persist();
    return true;
  }

  public getComment(id: string): Comment | undefined {
    return this.data.comments.find((c) => c.id === id);
  }

  public listComments(postId: string): Comment[] {
    return this.data.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public createComment(comment: Comment): Comment {
    this.data.comments.push(comment);
    const post = this.getPost(comment.postId);
    if (post) {
      post.commentCount = (post.commentCount || 0) + 1;
    }
    this.persist();
    return comment;
  }

  public deleteComment(commentId: string): boolean {
    const idx = this.data.comments.findIndex((c) => c.id === commentId);
    if (idx === -1) return false;
    const [deleted] = this.data.comments.splice(idx, 1);
    const post = this.getPost(deleted.postId);
    if (post) {
      post.commentCount = Math.max(0, (post.commentCount || 1) - 1);
    }
    this.persist();
    return true;
  }

  public listReactions(postId?: string): Reaction[] {
    if (postId) {
      return this.data.reactions.filter((r) => r.postId === postId);
    }
    return this.data.reactions;
  }

  public toggleReaction(postId: string, userId: string): { reacted: boolean; reactionCount: number } {
    const existingIdx = this.data.reactions.findIndex((r) => r.postId === postId && r.userId === userId);
    const post = this.getPost(postId);
    let reacted = false;

    if (existingIdx >= 0) {
      this.data.reactions.splice(existingIdx, 1);
      if (post) {
        post.reactionCount = Math.max(0, (post.reactionCount || 1) - 1);
      }
      reacted = false;
    } else {
      const newReaction: Reaction = {
        id: `rx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        postId,
        userId,
        type: 'fire',
        createdAt: new Date().toISOString(),
      };
      this.data.reactions.push(newReaction);
      if (post) {
        post.reactionCount = (post.reactionCount || 0) + 1;
      }
      reacted = true;
    }

    this.persist();
    return {
      reacted,
      reactionCount: post?.reactionCount || 0,
    };
  }

  // --- Projects ---
  public listProjects(searchQuery?: string, tag?: string): Project[] {
    let list = [...this.data.projects];
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.lookingForTags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (tag) {
      const t = tag.toLowerCase().trim();
      list = list.filter((p) => p.lookingForTags.some((tagItem) => tagItem.toLowerCase() === t));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getProject(id: string): Project | undefined {
    return this.data.projects.find((p) => p.id === id);
  }

  public createProject(project: Project): Project {
    this.data.projects.unshift(project);
    // Automatically create a linked project group chat conversation
    const projectConv: Conversation = {
      id: `conv_project_${project.id}`,
      type: 'project_group',
      title: `${project.name} (Team)`,
      description: `Team collaboration space for ${project.name}`,
      projectId: project.id,
      participantIds: [project.ownerId],
      unreadCounts: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.conversations.push(projectConv);
    this.persist();
    return project;
  }

  public updateProject(id: string, partial: Partial<Project>): Project | undefined {
    const proj = this.getProject(id);
    if (!proj) return undefined;
    Object.assign(proj, partial, { updatedAt: new Date().toISOString() });
    this.persist();
    return proj;
  }

  public listProjectUpdates(projectId: string): ProjectUpdate[] {
    return this.data.projectUpdates
      .filter((u) => u.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createProjectUpdate(update: ProjectUpdate): ProjectUpdate {
    this.data.projectUpdates.unshift(update);
    const proj = this.getProject(update.projectId);
    if (proj) {
      proj.updatesCount = (proj.updatesCount || 0) + 1;
    }
    this.persist();
    return update;
  }

  public listProjectDiscussions(projectId: string): ProjectDiscussion[] {
    return this.data.projectDiscussions
      .filter((d) => d.projectId === projectId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public createProjectDiscussion(discussion: ProjectDiscussion): ProjectDiscussion {
    this.data.projectDiscussions.push(discussion);
    const proj = this.getProject(discussion.projectId);
    if (proj) {
      proj.discussionCount = (proj.discussionCount || 0) + 1;
    }
    this.persist();
    return discussion;
  }

  public listProjectInterests(projectId?: string, userId?: string): ProjectInterest[] {
    return this.data.projectInterests.filter((pi) => {
      if (projectId && pi.projectId !== projectId) return false;
      if (userId && pi.userId !== userId) return false;
      return true;
    });
  }

  public createProjectInterest(interest: ProjectInterest): ProjectInterest {
    this.data.projectInterests.push(interest);
    const proj = this.getProject(interest.projectId);
    if (proj) {
      proj.interestCount = (proj.interestCount || 0) + 1;
    }
    this.persist();
    return interest;
  }

  public updateProjectInterest(id: string, partial: Partial<ProjectInterest>): ProjectInterest | undefined {
    const item = this.data.projectInterests.find((pi) => pi.id === id);
    if (!item) return undefined;
    Object.assign(item, partial);
    this.persist();
    return item;
  }

  // --- Connections ---
  public getConnection(id: string): Connection | undefined {
    return this.data.connections.find((c) => c.id === id);
  }

  public listConnections(userId?: string): Connection[] {
    if (!userId) return this.data.connections;
    return this.data.connections.filter(
      (c) => c.senderId === userId || c.recipientId === userId
    );
  }

  public findConnectionBetween(userA: string, userB: string): Connection | undefined {
    return this.data.connections.find(
      (c) =>
        (c.senderId === userA && c.recipientId === userB) ||
        (c.senderId === userB && c.recipientId === userA)
    );
  }

  public createConnection(connection: Connection): Connection {
    this.data.connections.push(connection);
    this.persist();
    return connection;
  }

  public updateConnection(id: string, status: ConnectionStatus): Connection | undefined {
    const c = this.data.connections.find((item) => item.id === id);
    if (!c) return undefined;
    c.status = status;
    c.updatedAt = new Date().toISOString();
    this.persist();
    return c;
  }

  public canMessage(userA: string, userB: string): boolean {
    if (userA === userB) return true;
    const conn = this.findConnectionBetween(userA, userB);
    return Boolean(conn && conn.status === 'accepted');
  }

  // --- Conversations & Messages ---
  public listConversations(userId?: string): Conversation[] {
    return this.data.conversations
      .filter((c) => c.type === 'general' || c.id === 'conv_general' || (userId && c.participantIds.includes(userId)))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getConversation(id: string): Conversation | undefined {
    let conv = this.data.conversations.find((c) => c.id === id);
    if (!conv && (id === 'conv_general' || id === 'general')) {
      conv = this.data.conversations.find((c) => c.type === 'general' || c.id === 'conv_general');
    }
    return conv;
  }

  public findDirectConversation(userA: string, userB: string): Conversation | undefined {
    return this.data.conversations.find(
      (c) =>
        c.type === 'direct' &&
        c.participantIds.length === 2 &&
        c.participantIds.includes(userA) &&
        c.participantIds.includes(userB)
    );
  }

  public createConversation(conversation: Conversation): Conversation {
    this.data.conversations.unshift(conversation);
    this.persist();
    return conversation;
  }

  public listMessages(conversationId: string): Message[] {
    return this.data.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public createMessage(message: Message): Message {
    this.data.messages.push(message);
    const conv = this.getConversation(message.conversationId);
    if (conv) {
      if (!conv.participantIds.includes(message.senderId)) {
        conv.participantIds.push(message.senderId);
      }
      conv.lastMessage = {
        senderId: message.senderId,
        senderDisplayName: message.sender.displayName,
        content: message.content,
        createdAt: message.createdAt,
      };
      conv.updatedAt = message.createdAt;
      // Increment unread counts for other participants
      conv.participantIds.forEach((pid) => {
        if (pid !== message.senderId) {
          conv.unreadCounts[pid] = (conv.unreadCounts[pid] || 0) + 1;
        }
      });
    }
    this.persist();
    return message;
  }

  public updateMessage(messageId: string, content: string): Message | null {
    const msg = this.data.messages.find((m) => m.id === messageId);
    if (!msg) return null;
    msg.content = content;
    msg.updatedAt = new Date().toISOString();
    const conv = this.getConversation(msg.conversationId);
    if (conv && conv.lastMessage) {
      const allForConv = this.listMessages(conv.id);
      const lastMsg = allForConv[allForConv.length - 1];
      if (lastMsg && lastMsg.id === msg.id) {
        conv.lastMessage.content = content;
      }
    }
    this.persist();
    return msg;
  }

  public deleteMessage(messageId: string): boolean {
    const idx = this.data.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return false;
    const msg = this.data.messages[idx];
    const convId = msg.conversationId;
    this.data.messages.splice(idx, 1);
    
    const conv = this.getConversation(convId);
    if (conv) {
      if (conv.pinnedMessageId === messageId) {
        conv.pinnedMessageId = null;
      }
      const remaining = this.listMessages(convId);
      if (remaining.length > 0) {
        const last = remaining[remaining.length - 1];
        conv.lastMessage = {
          senderId: last.senderId,
          senderDisplayName: last.sender.displayName,
          content: last.content,
          createdAt: last.createdAt,
        };
        conv.updatedAt = last.createdAt;
      } else {
        conv.lastMessage = undefined;
      }
    }
    this.persist();
    return true;
  }

  public pinMessageToConversation(conversationId: string, messageId: string | null): Conversation | undefined {
    const conv = this.getConversation(conversationId);
    if (!conv) return undefined;
    conv.pinnedMessageId = messageId;
    conv.updatedAt = new Date().toISOString();
    this.data.messages.forEach((m) => {
      if (m.conversationId === conv.id) {
        m.isPinned = Boolean(messageId && m.id === messageId);
      }
    });
    this.persist();
    return conv;
  }

  public markConversationRead(conversationId: string, userId: string): void {
    const conv = this.getConversation(conversationId);
    if (conv && conv.unreadCounts[userId]) {
      conv.unreadCounts[userId] = 0;
      this.persist();
    }
  }

  // --- Notifications ---
  public listNotifications(userId: string): InAppNotification[] {
    return this.data.notifications
      .filter((n) => n.recipientId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(notif: InAppNotification): InAppNotification {
    this.data.notifications.unshift(notif);
    this.persist();
    return notif;
  }

  public markNotificationRead(id: string, userId: string): boolean {
    const notif = this.data.notifications.find((n) => n.id === id && n.recipientId === userId);
    if (!notif) return false;
    notif.isRead = true;
    this.persist();
    return true;
  }

  public markAllNotificationsRead(userId: string): void {
    this.data.notifications.forEach((n) => {
      if (n.recipientId === userId) {
        n.isRead = true;
      }
    });
    this.persist();
  }

  // --- Search ---
  public searchAll(query: string) {
    const q = query.toLowerCase().trim();
    if (!q) {
      return { people: [], projects: [], posts: [], totalCount: 0 };
    }

    const people = this.data.users
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.profile.displayName.toLowerCase().includes(q) ||
          u.profile.bio.toLowerCase().includes(q) ||
          u.profile.interests.some((i) => i.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        category: 'people' as const,
        title: u.profile.displayName,
        subtitle: u.profile.bio ? `@${u.username} • ${u.profile.bio}` : `@${u.username}`,
        avatarUrl: u.profile.avatarUrl,
        avatarInitials: u.profile.avatarInitials,
        tags: u.profile.interests,
        deepLinkUrl: `/people?profile=${u.id}`,
      }));

    const projects = this.data.projects
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.lookingForTags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        category: 'projects' as const,
        title: p.name,
        subtitle: p.tagline,
        avatarUrl: p.coverImageUrl,
        tags: p.lookingForTags,
        deepLinkUrl: `/projects/${p.id}`,
      }));

    const posts = this.data.posts
      .filter((p) => p.content.toLowerCase().includes(q) || p.author.displayName.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        category: 'posts' as const,
        title: p.content.slice(0, 60) + (p.content.length > 60 ? '...' : ''),
        subtitle: `By ${p.author.displayName} • ${p.commentCount} replies • ${p.reactionCount} 🔥`,
        avatarUrl: p.author.avatarUrl,
        avatarInitials: p.author.avatarInitials,
        deepLinkUrl: `/common-space?post=${p.id}`,
      }));

    return {
      people,
      projects,
      posts,
      totalCount: people.length + projects.length + posts.length,
    };
  }
}

export const serverDb = new DatabaseManager();
