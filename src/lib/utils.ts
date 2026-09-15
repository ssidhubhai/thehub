import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes cleanly with clsx and twMerge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts uppercase initial from a name (first letter default everywhere)
 */
export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'S';
  const clean = name.trim().replace(/^@/, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  return parts[0].charAt(0).toUpperCase();
}

/**
 * Friendly relative time formatter
 */
export function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'recently';
  }
}

/**
 * Monospace clock timestamp e.g. "14:23"
 */
export function formatMonoTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '--:--';
  }
}
