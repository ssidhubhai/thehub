import { User, UserProfile } from '@/types/user';
import { mockDb, STORAGE_KEYS } from './mock/mockDb';
import { eventBus } from './mock/eventBus';
import { getInitials } from '@/lib/utils';
import { api } from '@/lib/api';

export interface AuthService {
  signUp(username: string, password?: string): Promise<User>;
  signIn(username: string, password?: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
  updateProfile(userId: string, partialProfile: Partial<UserProfile>): Promise<User>;
  subscribeAuthChange(callback: (user: User | null) => void): () => void;
}

class UnifiedAuthService implements AuthService {
  private currentUser: User | null = null;

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch {
      this.currentUser = null;
    }
  }

  private persistSession(user: User | null): void {
    this.currentUser = user;
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    }
    eventBus.emit('auth:state_change', user);
  }

  async signUp(username: string, password?: string): Promise<User> {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      throw new Error('Username is required');
    }
    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    try {
      const { user } = await api.auth.register(cleanUsername, password);
      this.persistSession(user);
      return user;
    } catch (apiErr: any) {
      // If server error indicates user already exists or validation, throw it directly
      if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      // Fallback to local mock if server is unreachable
      const existingUsers = await mockDb.list<User>(STORAGE_KEYS.USERS);
      const existing = existingUsers.find((u) => u.username.toLowerCase() === cleanUsername);
      if (existing) {
        throw new Error('Username is already taken');
      }

      const now = new Date().toISOString();
      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        username: cleanUsername,
        passwordHash: password ? `mock_hash_${password}` : undefined,
        profile: {
          displayName: cleanUsername,
          bio: '',
          avatarInitials: getInitials(cleanUsername),
          interests: [],
          currentlyLearning: '',
          currentlyBuilding: '',
          joinedAt: now,
          isOnboarded: false,
        },
        presence: {
          status: 'online',
          lastActiveAt: now,
        },
        createdAt: now,
        updatedAt: now,
      };

      await mockDb.create<User>(STORAGE_KEYS.USERS, newUser);
      this.persistSession(newUser);
      return newUser;
    }
  }

  async signIn(username: string, password?: string): Promise<User> {
    const cleanUsername = username.trim().toLowerCase();
    try {
      const { user } = await api.auth.login(cleanUsername, password);
      this.persistSession(user);
      return user;
    } catch (apiErr: any) {
      if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      const existingUsers = await mockDb.list<User>(STORAGE_KEYS.USERS);
      const user = existingUsers.find((u) => u.username.toLowerCase() === cleanUsername);

      if (!user) {
        throw new Error('User not found with this username');
      }

      if (password && user.passwordHash && user.passwordHash !== `mock_hash_${password}`) {
        throw new Error('Invalid password');
      }

      user.presence = {
        status: 'online',
        lastActiveAt: new Date().toISOString(),
      };
      await mockDb.update<User>(STORAGE_KEYS.USERS, user.id, { presence: user.presence });

      this.persistSession(user);
      return user;
    }
  }

  async signOut(): Promise<void> {
    try {
      await api.auth.logout();
    } catch {
      // Continue
    }
    if (this.currentUser) {
      try {
        await mockDb.update<User>(STORAGE_KEYS.USERS, this.currentUser.id, {
          presence: {
            status: 'offline',
            lastActiveAt: new Date().toISOString(),
          },
        });
      } catch {
        // Safe ignore
      }
    }
    this.persistSession(null);
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      this.restoreSession();
    }
    return this.currentUser;
  }

  async updateProfile(userId: string, partialProfile: Partial<UserProfile>): Promise<User> {
    try {
      const res = await api.auth.updateProfile(partialProfile);
      this.persistSession(res.user);
      return res.user;
    } catch (apiErr: any) {
      if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
      const user = await mockDb.get<User>(STORAGE_KEYS.USERS, userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updatedProfile: UserProfile = {
        ...user.profile,
        ...partialProfile,
      };

      if (partialProfile.displayName && !partialProfile.avatarInitials) {
        updatedProfile.avatarInitials = getInitials(partialProfile.displayName);
      }

      const updatedUser: User = {
        ...user,
        profile: updatedProfile,
        updatedAt: new Date().toISOString(),
      };

      await mockDb.update<User>(STORAGE_KEYS.USERS, userId, {
        profile: updatedProfile,
        updatedAt: updatedUser.updatedAt,
      });

      if (this.currentUser && this.currentUser.id === userId) {
        this.persistSession(updatedUser);
      }

      return updatedUser;
    }
  }

  subscribeAuthChange(callback: (user: User | null) => void): () => void {
    return eventBus.subscribe('auth:state_change', callback);
  }
}

export const authService = new UnifiedAuthService();

