import * as React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useChatStore } from '@/stores/useChatStore';
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/primitives';
import {
  Flame,
  Search,
  Bell,
  MessageSquare,
  Users,
  FolderGit2,
  Home,
  User,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { VerifiedBadge } from '@/components/primitives/VerifiedBadge';
import { cn } from '@/lib/utils';
import { isMockMode } from '@/lib/firebase';

export type NavTab = 'home' | 'people' | 'projects' | 'messages';

export interface DesktopNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onViewOwnProfile: () => void;
  activeTheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function DesktopNav({
  currentTab,
  onTabChange,
  onOpenSearch,
  onOpenNotifications,
  onViewOwnProfile,
  activeTheme,
  onToggleTheme,
}: DesktopNavProps) {
  const { user, logout } = useAuthStore();
  const { unreadCount: notifUnread } = useNotificationStore();
  const { conversations } = useChatStore();

  // Total unread messages count across all conversations
  const chatUnread = React.useMemo(() => {
    if (!user) return 0;
    return (conversations || []).reduce((acc, c) => acc + (c?.unreadCounts?.[user.id] || 0), 0);
  }, [conversations, user]);

  const navItems = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'people' as NavTab, label: 'People', icon: Users },
    { id: 'projects' as NavTab, label: 'Projects', icon: FolderGit2 },
    { id: 'messages' as NavTab, label: 'Messages', icon: MessageSquare, badge: chatUnread },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => onTabChange('home')}
            className="flex items-center gap-2.5 focus-visible:outline-none group text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-xs group-hover:scale-105 transition-transform">
              <Flame className="h-5 w-5 text-flame-500 fill-flame-500" />
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                The Hub
              </span>
              <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live API
              </span>
            </div>
          </button>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold font-sans transition-all',
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-flame-500' : 'text-muted-foreground')} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="h-4 w-4 rounded-full bg-flame-500 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Global Search Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSearch}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-2 font-mono hidden sm:inline-flex"
            aria-label="Open global search"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline font-sans text-xs">Search</span>
            <kbd className="hidden lg:inline-flex font-mono text-[9px] border border-border/80 px-1 py-0.2 rounded bg-muted/40">
              ⌘K
            </kbd>
          </Button>

          {/* Notification Bell with Badge */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenNotifications}
            className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
            {notifUnread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-flame-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
                {notifUnread}
              </span>
            )}
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleTheme}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Toggle light and dark theme"
          >
            {activeTheme === 'light' ? (
              <Moon className="h-3.5 w-3.5" />
            ) : (
              <Sun className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Sign Out Action */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              iconPrefix={<LogOut className="h-3.5 w-3.5" />}
              className="text-xs text-muted-foreground hover:text-destructive hidden sm:inline-flex"
              title="Sign Out"
              aria-label="Sign Out"
            >
              Sign Out
            </Button>
          )}

          {/* User Profile Dropdown Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 pl-1 pr-2 py-0.5 rounded-full border border-border bg-card hover:bg-muted/40 transition-colors focus-visible:outline-none"
                  aria-label="User menu"
                >
                  <Avatar
                    src={user.profile.avatarUrl}
                    name={user.profile.displayName}
                    size="xs"
                    showPresence
                    isOnline
                  />
                  <span className="hidden sm:inline font-display font-semibold text-xs text-foreground truncate max-w-[120px]">
                    {user.profile.displayName}
                  </span>
                  <VerifiedBadge
                    role={user.role || user.profile?.role}
                    isVerified={user.isVerified || user.profile?.isVerified || user.username === 'sidhu001'}
                    size="sm"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-left">
                <div className="p-2.5 border-b border-border/60 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-display font-bold text-xs text-foreground truncate">
                      {user.profile.displayName}
                    </p>
                    <VerifiedBadge
                      role={user.role || user.profile?.role}
                      isVerified={user.isVerified || user.profile?.isVerified || user.username === 'sidhu001'}
                      showRoleTag
                      size="sm"
                    />
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground truncate">
                    @{user.username}
                  </p>
                </div>
                <DropdownMenuItem
                  onClick={onViewOwnProfile}
                  className="gap-2 text-xs cursor-pointer py-2"
                >
                  <User className="h-3.5 w-3.5 text-flame-500" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer py-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
