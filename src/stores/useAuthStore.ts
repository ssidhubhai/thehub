import { create } from 'zustand';
import { User, UserProfile } from '@/types/user';
import { authService } from '@/lib/firebase/auth';
import { mockDb, STORAGE_KEYS } from '@/lib/firebase/mock/mockDb';
import { Conversation } from '@/types/message';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  login: (username: string, password?: string) => Promise<User>;
  register: (username: string, password?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (partial: Partial<UserProfile>) => Promise<User>;
  completeOnboarding: (data: {
    displayName: string;
    bio: string;
    interests: string[];
    currentlyLearning: string;
    currentlyBuilding: string;
    avatarUrl?: string;
  }) => Promise<User>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  init: async () => {
    try {
      mockDb.ensureInitialized();
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        set({ user: currentUser, isAuthenticated: true, isLoading: false, error: null });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      }

      // Listen for auth changes across tabs
      authService.subscribeAuthChange((user) => {
        set({ user, isAuthenticated: Boolean(user) });
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to init auth' });
    }
  },

  login: async (username: string, password?: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signIn(username, password);
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return user;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Login failed' });
      throw err;
    }
  },

  register: async (username: string, password?: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signUp(username, password);
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return user;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Registration failed' });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.signOut();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Logout failed' });
    }
  },

  updateProfile: async (partial: Partial<UserProfile>) => {
    const { user } = get();
    if (!user) throw new Error('Not authenticated');

    const updatedUser = await authService.updateProfile(user.id, partial);
    set({ user: updatedUser });
    return updatedUser;
  },

  completeOnboarding: async (data) => {
    const { user } = get();
    if (!user) throw new Error('Not authenticated');

    let updatedUser: User;
    try {
      updatedUser = await authService.updateProfile(user.id, {
        ...data,
        isOnboarded: true,
      });
    } catch (err) {
      console.warn('Fallback updating profile in completeOnboarding:', err);
      updatedUser = {
        ...user,
        profile: {
          ...user.profile,
          ...data,
          isOnboarded: true,
        },
        updatedAt: new Date().toISOString(),
      };
    }

    // Auto-enroll user in "The Hub — General" conversation
    try {
      const generalConv = await mockDb.get<Conversation>(STORAGE_KEYS.CONVERSATIONS, 'conv_general');
      if (generalConv && !generalConv.participantIds.includes(user.id)) {
        await mockDb.update<Conversation>(STORAGE_KEYS.CONVERSATIONS, 'conv_general', {
          participantIds: [...generalConv.participantIds, user.id],
        });
      }
    } catch (err) {
      console.warn('Could not auto-enroll in General chat:', err);
    }

    set({ user: updatedUser });
    return updatedUser;
  },

  reset: () => {
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },
}));
