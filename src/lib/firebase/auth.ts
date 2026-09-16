import { User, UserProfile } from '@/types/user';
import { mockDb, STORAGE_KEYS } from './mock/mockDb';
import { eventBus } from './mock/eventBus';
import { getInitials } from '@/lib/utils';
import { api, setStoredToken } from '@/lib/api';

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

  private persistSession(user: User | null, token?: string): void {
    this.currentUser = user;
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(user));
      if (token) {
        setStoredToken(token);
      } else {
        setStoredToken(`token_${user.id}_${user.username}`);
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      setStoredToken(null);
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
    if (!password || password.trim().length < 3) {
      throw new Error('Password must be at least 3 characters long');
    }

    const { user, token } = await api.auth.register(cleanUsername, password);
    this.persistSession(user, token);
    return user;
  }

  async signIn(username: string, password?: string): Promise<User> {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      throw new Error('Username is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }

    const { user, token } = await api.auth.login(cleanUsername, password);
    this.persistSession(user, token);
    return user;
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
    } catch {
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

