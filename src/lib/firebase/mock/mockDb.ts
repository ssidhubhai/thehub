import { eventBus } from './eventBus';
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

  public ensureInitialized(): void {
    try {
      if (typeof window === 'undefined') return;

      const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!usersRaw) {
        this.resetToSeed();
        return;
      }

      // Validate JSON integrity and purge old seed data if present
      try {
        const parsed = JSON.parse(usersRaw);
        if (Array.isArray(parsed)) {
          const hasDummyUser = parsed.some((u: any) => u.username === 'maya_lin' || u.username === 'alex_river');
          if (hasDummyUser) {
            this.resetToSeed();
            return;
          }
        }
      } catch {
        console.warn('Corrupted database detected in localStorage, restoring seed data');
        this.resetToSeed();
      }
    } catch (err) {
      console.error('Failed to initialize MockDatabase:', err);
    }
  }

  public resetToSeed(): void {
    if (typeof window === 'undefined') return;

    // Retain sidhu001 lead user without dummy data
    const existingUsers = this.getItems<any>(STORAGE_KEYS.USERS);
    const existingSidhu = existingUsers.find((u) => u.username === 'sidhu001');

    const sidhuUser = existingSidhu || {
      id: 'user_sidhu001',
      username: 'sidhu001',
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

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([sidhuUser]));
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

  private getItems<T>(collectionKey: string): T[] {
    this.ensureInitialized();
    try {
      const raw = localStorage.getItem(collectionKey);
      if (!raw) return [];
      return JSON.parse(raw) as T[];
    } catch {
      console.warn(`Error parsing items for collection ${collectionKey}, returning empty array`);
      return [];
    }
  }

  private setItems<T>(collectionKey: string, items: T[]): void {
    this.ensureInitialized();
    try {
      localStorage.setItem(collectionKey, JSON.stringify(items));
      eventBus.emit(`collection:${collectionKey}`, items);
      eventBus.emit('change', { key: collectionKey, items });
    } catch (err) {
      console.error(`Error saving collection ${collectionKey} to localStorage:`, err);
    }
  }

  async get<T extends { id: string }>(collectionKey: string, id: string): Promise<T | null> {
    const items = this.getItems<T>(collectionKey);
    return items.find((item) => item.id === id) || null;
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
    return newItem as T & { id: string };
  }

  async update<T extends { id: string }>(collectionKey: string, id: string, partial: Partial<T>): Promise<void> {
    const items = this.getItems<T>(collectionKey);
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) {
      items[index] = { ...items[index], ...partial };
      this.setItems(collectionKey, items);
    }
  }

  async delete(collectionKey: string, id: string): Promise<void> {
    const items = this.getItems<{ id: string }>(collectionKey);
    const filtered = items.filter((item) => item.id !== id);
    this.setItems(collectionKey, filtered);
  }

  subscribe(collectionKey: string, callback: () => void): () => void {
    return eventBus.subscribe(`collection:${collectionKey}`, callback);
  }
}

export const mockDb = new MockDatabase();
