import { UserPresence } from './common';

export interface UserProfile {
  displayName: string;
  bio: string;
  avatarUrl?: string;
  avatarInitials: string; // e.g. "JD"
  interests: string[]; // e.g. ["React", "TypeScript", "AI", "Design"]
  currentlyLearning: string; // e.g. "Rust and WebAssembly"
  currentlyBuilding: string; // e.g. "An autonomous agent runner"
  joinedAt: string; // ISO-8601 string
  isOnboarded: boolean;
  role?: 'member' | 'moderator' | 'admin';
  isVerified?: boolean;
}

export interface User {
  id: string; // unique UUID or username slug
  username: string; // lowercase, alphanumeric + underscores, unique
  passwordHash?: string; // used internally in mock authentication
  role?: 'member' | 'moderator' | 'admin';
  isVerified?: boolean;
  profile: UserProfile;
  presence: UserPresence;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}
