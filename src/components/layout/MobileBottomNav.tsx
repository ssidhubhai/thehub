import * as React from 'react';
import { NavTab } from './DesktopNav';
import { useChatStore } from '@/stores/useChatStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Home, Users, FolderGit2, MessageSquare, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileBottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenSearch: () => void;
}

export function MobileBottomNav({
  currentTab,
  onTabChange,
  onOpenSearch,
}: MobileBottomNavProps) {
  const { user } = useAuthStore();
  const { conversations } = useChatStore();

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
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-lg px-2 py-1.5 pb-safe"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-5 items-center justify-items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn(
                'relative flex flex-col items-center justify-center w-full py-1 gap-1 text-[10px] font-sans font-medium transition-colors',
                isActive ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform duration-150',
                    isActive ? 'text-flame-500 scale-105' : 'text-muted-foreground'
                  )}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 h-3.5 w-3.5 rounded-full bg-flame-500 text-white font-mono text-[8px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* 5th Mobile Tab: Search */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex flex-col items-center justify-center w-full py-1 gap-1 text-[10px] font-sans font-medium text-muted-foreground hover:text-foreground"
          aria-label="Search"
        >
          <Search className="h-5 w-5 text-muted-foreground" />
          <span>Search</span>
        </button>
      </div>
    </nav>
  );
}
