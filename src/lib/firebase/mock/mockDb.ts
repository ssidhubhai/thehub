import { eventBus } from './eventBus';
import { db } from '../config';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { Connection } from '@/types/common';
import { Project, ProjectInterest } from '@/types/project';
import { User } from '@/types/user';
import { InAppNotification } from '@/types/notification';
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
} from './seedData';

export const STORAGE_KEYS = {
  USERS: 'thehub_users',
  POSTS: 'thehub_posts',
  COMMENTS: 'thehub_comments',
  REACTIONS: 'thehub_reactions',
  PROJECTS: 'thehub_projects',
  PROJECT_UPDATES: 'thehub_project_updates',
  PROJECT_DISCUSSIONS: 'thehub_project_discussions',
  PROJECT_INTEREST: 'thehub_project_interest',
  CONVERSATIONS: 'thehub_conversations',
  MESSAGES: 'thehub_messages',
  NOTIFICATIONS: 'thehub_notifications',
  CONNECTIONS: 'thehub_connections',
  AUTH_SESSION: 'thehub_auth_session',
} as const;

export class MockDatabase {
  constructor() {
    this.ensureInitialized();
  }

  public static normalizeKey(collectionKey: string): string {
    const keyMap: Record<string, string> = {
      users: STORAGE_KEYS.USERS,
      posts: STORAGE_KEYS.POSTS,
      comments: STORAGE_KEYS.COMMENTS,
      reactions: STORAGE_KEYS.REACTIONS,
      projects: STORAGE_KEYS.PROJECTS,
      project_updates: STORAGE_KEYS.PROJECT_UPDATES,
      project_discussions: STORAGE_KEYS.PROJECT_DISCUSSIONS,
      project_interest: STORAGE_KEYS.PROJECT_INTEREST,
      conversations: STORAGE_KEYS.CONVERSATIONS,
      messages: STORAGE_KEYS.MESSAGES,
      notifications: STORAGE_KEYS.NOTIFICATIONS,
      connections: STORAGE_KEYS.CONNECTIONS,
    };
    return keyMap[collectionKey] || (collectionKey.startsWith('thehub_') ? collectionKey : `thehub_${collectionKey}`);
  }

  public ensureInitialized(): void {
    try {
      if (typeof window === 'undefined') return;

      const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
      const altUsersRaw = localStorage.getItem('users');

      if (!usersRaw && !altUsersRaw) {
        this.resetToSeed();
        return;
      }

      // Check for dummy mock users like maya_lin and prune them non-destructively
      try {
        let parsed: any[] = [];
        if (usersRaw) {
          const u = JSON.parse(usersRaw);
          if (Array.isArray(u)) parsed.push(...u);
        }
        if (altUsersRaw) {
          const a = JSON.parse(altUsersRaw);
          if (Array.isArray(a)) parsed.push(...a);
        }

        // Deduplicate and filter out dummy users
        const userMap = new Map<string, any>();
        parsed.forEach((user) => {
          if (user && user.username && user.username !== 'maya_lin' && user.username !== 'alex_river') {
            userMap.set(user.username.toLowerCase(), user);
          }
        });

        // Ensure sidhu001 exists
        if (!userMap.has('sidhu001')) {
          userMap.set('sidhu001', this.getLeadUser());
        }

        const cleanedUsers = Array.from(userMap.values());
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cleanedUsers));
        localStorage.setItem('users', JSON.stringify(cleanedUsers));
      } catch {
        console.warn('Corrupted database detected in localStorage, restoring seed data');
        this.resetToSeed();
      }
    } catch (err) {
      console.error('Failed to initialize MockDatabase:', err);
    }
  }

  public getLeadUser(): any {
    return {
      id: 'user_sidhu001',
      username: 'sidhu001',
      passwordHash: 'a385751d4e446a8c4f6bdf6c8f89c41c2d4971cb11a8f6aa6b094a21fe9628de',
      role: 'moderator',
      isVerified: true,
      profile: {
        displayName: 'Sidhu',
        bio: 'The Hub Community Lead & Moderator. Reach out anytime if you need help, project guidance, or community support!',
        avatarUrl: '', // Initials fallback
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
    };
  }

  public resetToSeed(): void {
    if (typeof window === 'undefined') return;

    // Retain all real registered users, ensuring no user is forgotten
    const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    const altRawUsers = localStorage.getItem('users');
    let combinedUsers: any[] = [];

    try {
      if (rawUsers) combinedUsers.push(...JSON.parse(rawUsers));
      if (altRawUsers) combinedUsers.push(...JSON.parse(altRawUsers));
    } catch {}

    const userMap = new Map<string, any>();
    combinedUsers.forEach((u) => {
      if (u && u.username && u.username !== 'maya_lin' && u.username !== 'alex_river') {
        userMap.set(u.username.toLowerCase(), u);
      }
    });

    // Ensure sidhu001 lead user is intact
    if (!userMap.has('sidhu001')) {
      userMap.set('sidhu001', this.getLeadUser());
    }

    const preservedUsers = Array.from(userMap.values());

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(preservedUsers));
    localStorage.setItem('users', JSON.stringify(preservedUsers));
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.REACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PROJECT_UPDATES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PROJECT_DISCUSSIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PROJECT_INTEREST, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));

    eventBus.emit('database:reset');
  }

  public getItems<T>(collectionKey: string): T[] {
    this.ensureInitialized();
    const normalizedKey = MockDatabase.normalizeKey(collectionKey);
    try {
      const raw = localStorage.getItem(normalizedKey);
      let items: T[] = raw ? JSON.parse(raw) : [];

      // Check un-prefixed key and merge if any items were saved under that key
      const unPrefixed = collectionKey.replace('thehub_', '');
      if (unPrefixed !== normalizedKey) {
        const altRaw = localStorage.getItem(unPrefixed);
        if (altRaw) {
          try {
            const altItems = JSON.parse(altRaw) as T[];
            if (Array.isArray(altItems) && altItems.length > 0) {
              const existingIds = new Set((items as any[]).map((i) => i.id));
              let added = false;
              for (const alt of altItems) {
                if ((alt as any)?.id && !existingIds.has((alt as any).id)) {
                  (items as any[]).push(alt);
                  added = true;
                }
              }
              if (added) {
                localStorage.setItem(normalizedKey, JSON.stringify(items));
              }
            }
          } catch {}
        }
      }

      return items;
    } catch {
      console.warn(`Error parsing items for collection ${collectionKey}, returning empty array`);
      return [];
    }
  }

  public setItems<T>(collectionKey: string, items: T[]): void {
    this.ensureInitialized();
    const normalizedKey = MockDatabase.normalizeKey(collectionKey);
    try {
      localStorage.setItem(normalizedKey, JSON.stringify(items));
      const unPrefixed = collectionKey.replace('thehub_', '');
      if (unPrefixed !== normalizedKey) {
        localStorage.setItem(unPrefixed, JSON.stringify(items));
      }
      eventBus.emit(`collection:${normalizedKey}`, items);
      eventBus.emit(`collection:${unPrefixed}`, items);
      eventBus.emit('change', { key: normalizedKey, items });
    } catch (err) {
      console.error(`Error saving collection ${collectionKey} to localStorage:`, err);
    }
  }

  async get<T extends { id: string }>(collectionKey: string, id: string): Promise<T | null> {
    const items = this.getItems<T>(collectionKey);
    let item = items.find((it) => it.id === id);
    if (!item && (collectionKey === 'users' || collectionKey === STORAGE_KEYS.USERS)) {
      item = items.find((it: any) => it.username?.toLowerCase() === id.toLowerCase());
    }
    return item || null;
  }

  async list<T>(collectionKey: string, filterFn?: (item: T) => boolean): Promise<T[]> {
    const items = this.getItems<T>(collectionKey);
    return filterFn ? items.filter(filterFn) : items;
  }

  async set<T extends { id: string }>(collectionKey: string, id: string, data: T): Promise<void> {
    const items = this.getItems<T>(collectionKey);
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) {
      items[index] = { ...data, id };
    } else {
      items.push({ ...data, id });
    }
    this.setItems(collectionKey, items);

    if (db) {
      try {
        const normalizedKey = MockDatabase.normalizeKey(collectionKey);
        const docRef = doc(db, normalizedKey, id);
        await setDoc(docRef, data, { merge: true });
      } catch (err) {
        console.warn(`[Firestore sync set] ${collectionKey}/${id}:`, err);
      }
    }
  }

  async create<T extends Record<string, any> = Record<string, any>>(
    collectionKey: string,
    data: Partial<T> | Record<string, any>
  ): Promise<T & { id: string }> {
    const items = this.getItems<any>(collectionKey);
    const id =
      (data as any).id ||
      `${collectionKey.replace('thehub_', '')}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newItem = { ...data, id };
    items.unshift(newItem);
    this.setItems(collectionKey, items);

    if (db) {
      try {
        const normalizedKey = MockDatabase.normalizeKey(collectionKey);
        const docRef = doc(db, normalizedKey, id);
        await setDoc(docRef, newItem);
      } catch (err) {
        console.warn(`[Firestore sync create] ${collectionKey}/${id}:`, err);
      }
    }

    return newItem as T & { id: string };
  }

  async update<T extends { id: string }>(collectionKey: string, id: string, partial: Partial<T>): Promise<void> {
    const items = this.getItems<T>(collectionKey);
    let index = items.findIndex((item) => item.id === id);
    if (index < 0 && (collectionKey === 'users' || collectionKey === STORAGE_KEYS.USERS)) {
      index = items.findIndex((item: any) => item.username?.toLowerCase() === id.toLowerCase());
    }
    if (index >= 0) {
      items[index] = { ...items[index], ...partial };
      this.setItems(collectionKey, items);
    }

    if (db) {
      try {
        const normalizedKey = MockDatabase.normalizeKey(collectionKey);
        const targetId = index >= 0 ? items[index].id : id;
        const docRef = doc(db, normalizedKey, targetId);
        await updateDoc(docRef, partial as Record<string, any>);
      } catch (err) {
        console.warn(`[Firestore sync update] ${collectionKey}/${id}:`, err);
      }
    }
  }

  async delete(collectionKey: string, id: string): Promise<void> {
    const items = this.getItems<{ id: string }>(collectionKey);
    const filtered = items.filter((item) => item.id !== id);
    this.setItems(collectionKey, filtered);

    if (db) {
      try {
        const docRef = doc(db, collectionKey, id);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn(`[Firestore sync delete] ${collectionKey}/${id}:`, err);
      }
    }
  }

  subscribe(collectionKey: string, callback: () => void): () => void {
    return eventBus.subscribe(`collection:${collectionKey}`, callback);
  }

  // ============================================================
  // DATABASE SERVICE LAYER MOCK HANDLERS FOR ACTIONS
  // ============================================================

  /**
   * Mock POST handler for connection requests
   */
  async connect(senderId: string, recipientId: string): Promise<Connection> {
    this.ensureInitialized();
    if (!senderId || !recipientId) {
      throw new Error('Sender and recipient are required');
    }
    if (senderId === recipientId) {
      throw new Error('Cannot connect to yourself');
    }

    const allConns = this.getItems<Connection>(STORAGE_KEYS.CONNECTIONS);
    const existing = allConns.find(
      (c) =>
        (c.senderId === senderId && c.recipientId === recipientId) ||
        (c.senderId === recipientId && c.recipientId === senderId)
    );

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('You are already connected with this user');
      }
      throw new Error('A connection request is already pending between you two');
    }

    const now = new Date().toISOString();
    const newConn: Connection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId,
      recipientId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await this.create<Connection>(STORAGE_KEYS.CONNECTIONS, newConn);

    // Notify recipient
    const users = this.getItems<User>(STORAGE_KEYS.USERS);
    const sender = users.find((u) => u.id === senderId);
    if (sender) {
      const notif: InAppNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recipientId,
        type: 'connection_request',
        payload: {
          actorId: sender.id,
          actorName: sender.profile?.displayName || sender.username,
          actorAvatarUrl: sender.profile?.avatarUrl,
          actorAvatarInitials: sender.profile?.avatarInitials,
          targetId: newConn.id,
          targetTitle: 'Connection Request',
          messageSnippet: `${sender.profile?.displayName || sender.username} wants to connect with you.`,
          deepLinkUrl: `/people?profile=${sender.username}`,
        },
        isRead: false,
        createdAt: now,
      };
      await this.create<InAppNotification>(STORAGE_KEYS.NOTIFICATIONS, notif);
    }

    return newConn;
  }

  /**
   * Mock POST/PATCH handler for accepting connections
   */
  async acceptConnection(connectionId: string, recipientId?: string): Promise<Connection> {
    this.ensureInitialized();
    const conn = await this.get<Connection>(STORAGE_KEYS.CONNECTIONS, connectionId);
    if (!conn) {
      throw new Error('Connection request not found');
    }
    if (recipientId && conn.recipientId !== recipientId) {
      throw new Error('Only the recipient can accept this connection');
    }

    const now = new Date().toISOString();
    await this.update<Connection>(STORAGE_KEYS.CONNECTIONS, connectionId, {
      status: 'accepted',
      updatedAt: now,
    });

    const updatedConn: Connection = { ...conn, status: 'accepted', updatedAt: now };

    // Notify sender
    const users = this.getItems<User>(STORAGE_KEYS.USERS);
    const recipient = users.find((u) => u.id === conn.recipientId);
    if (recipient) {
      const notif: InAppNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recipientId: conn.senderId,
        type: 'connection_accepted',
        payload: {
          actorId: recipient.id,
          actorName: recipient.profile?.displayName || recipient.username,
          actorAvatarUrl: recipient.profile?.avatarUrl,
          actorAvatarInitials: recipient.profile?.avatarInitials,
          targetId: conn.id,
          targetTitle: 'Connection Accepted',
          messageSnippet: `${recipient.profile?.displayName || recipient.username} accepted your connection request!`,
          deepLinkUrl: `/people?profile=${recipient.username}`,
        },
        isRead: false,
        createdAt: now,
      };
      await this.create<InAppNotification>(STORAGE_KEYS.NOTIFICATIONS, notif);
    }

    return updatedConn;
  }

  /**
   * Mock POST/PATCH handler for declining connections
   */
  async declineConnection(connectionId: string, recipientId?: string): Promise<void> {
    this.ensureInitialized();
    const conn = await this.get<Connection>(STORAGE_KEYS.CONNECTIONS, connectionId);
    if (conn && recipientId && conn.recipientId !== recipientId) {
      throw new Error('Only the recipient can decline this connection');
    }
    await this.delete(STORAGE_KEYS.CONNECTIONS, connectionId);
  }

  /**
   * Mock POST handler for pitching / expressing interest in a project
   */
  async pitchProject(projectId: string, userId: string, message?: string): Promise<ProjectInterest> {
    this.ensureInitialized();
    const project = await this.get<Project>(STORAGE_KEYS.PROJECTS, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.ownerId === userId) {
      throw new Error('You are the owner of this project');
    }

    const users = this.getItems<User>(STORAGE_KEYS.USERS);
    const user = users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    const allInterests = this.getItems<ProjectInterest>(STORAGE_KEYS.PROJECT_INTEREST);
    const existing = allInterests.find(
      (i) => i.projectId === projectId && i.userId === userId
    );
    if (existing) {
      throw new Error('You have already expressed interest or pitched for this project');
    }

    const now = new Date().toISOString();
    const newInterest: ProjectInterest = {
      id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      userId: user.id,
      applicant: {
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatarUrl: user.profile?.avatarUrl,
        avatarInitials: user.profile?.avatarInitials,
      },
      message: (message || '').trim(),
      status: 'submitted',
      createdAt: now,
    };

    await this.create<ProjectInterest>(STORAGE_KEYS.PROJECT_INTEREST, newInterest);

    // Update project count
    const newCount = (project.interestCount || 0) + 1;
    await this.update<Project>(STORAGE_KEYS.PROJECTS, projectId, {
      interestCount: newCount,
    });

    // Notify project owner
    const notif: InAppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipientId: project.ownerId,
      type: 'project_interest',
      payload: {
        actorId: user.id,
        actorName: user.profile?.displayName || user.username,
        actorAvatarUrl: user.profile?.avatarUrl,
        actorAvatarInitials: user.profile?.avatarInitials,
        targetId: projectId,
        targetTitle: project.name,
        messageSnippet: message?.trim() ? `"${message.slice(0, 60)}..."` : `${user.profile?.displayName || user.username} pitched interest in your project.`,
        deepLinkUrl: `/projects/${projectId}?tab=roster`,
      },
      isRead: false,
      createdAt: now,
    };
    await this.create<InAppNotification>(STORAGE_KEYS.NOTIFICATIONS, notif);

    return newInterest;
  }

  /**
   * Alias for pitchProject
   */
  async expressInterest(projectId: string, userId: string, message?: string): Promise<ProjectInterest> {
    return this.pitchProject(projectId, userId, message);
  }

  /**
   * Generic Mock POST handler dispatcher
   */
  async handlePost(endpoint: string, body: any, currentUser?: User | null): Promise<any> {
    this.ensureInitialized();
    const cleanEndpoint = endpoint.split('?')[0].replace(/^\/api\//, '');

    // Connect handler
    if (cleanEndpoint === 'connections' || cleanEndpoint === 'connections/request' || cleanEndpoint === 'connect') {
      if (!currentUser) throw new Error('Must be signed in');
      const recipientId = body.recipientId || body.targetUserId || body.userId;
      return this.connect(currentUser.id, recipientId);
    }

    // Connect accept handler
    const acceptMatch = cleanEndpoint.match(/^connections\/([^/]+)\/accept$/);
    if (acceptMatch) {
      if (!currentUser) throw new Error('Must be signed in');
      return this.acceptConnection(acceptMatch[1], currentUser.id);
    }

    // Connect decline handler
    const declineMatch = cleanEndpoint.match(/^connections\/([^/]+)\/decline$/);
    if (declineMatch) {
      if (!currentUser) throw new Error('Must be signed in');
      return this.declineConnection(declineMatch[1], currentUser.id);
    }

    // Pitch / Express Interest handler
    const pitchMatch = cleanEndpoint.match(/^projects\/([^/]+)\/(interest|pitch|pitches|interests)$/);
    if (pitchMatch) {
      if (!currentUser) throw new Error('Must be signed in');
      return this.pitchProject(pitchMatch[1], currentUser.id, body?.message);
    }

    if (cleanEndpoint === 'projects/interest' || cleanEndpoint === 'projects/pitch' || cleanEndpoint === 'pitch') {
      if (!currentUser) throw new Error('Must be signed in');
      const projectId = body.projectId || body.id;
      return this.pitchProject(projectId, currentUser.id, body?.message);
    }

    throw new Error(`Unhandled mock POST endpoint: ${endpoint}`);
  }
}

export const mockDb = new MockDatabase();
