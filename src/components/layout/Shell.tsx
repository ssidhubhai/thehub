import * as React from 'react';
import { DesktopNav, NavTab } from './DesktopNav';
import { MobileBottomNav } from './MobileBottomNav';
import { NotificationDrawer } from '@/features/notifications';
import { GlobalSearchModal } from '@/features/search';
import { ToastContainer } from '@/components/primitives/Toast';
import { cn } from '@/lib/utils';

export interface ShellProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  onViewOwnProfile: () => void;
  onNavigateToUser?: (userId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToPost?: (postId: string) => void;
  onNavigateToTargetUrl?: (url: string) => void;
  children: React.ReactNode;
}

export function Shell({
  currentTab,
  onTabChange,
  activeTheme,
  onToggleTheme,
  onViewOwnProfile,
  onNavigateToUser,
  onNavigateToProject,
  onNavigateToPost,
  onNavigateToTargetUrl,
  children,
}: ShellProps) {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);

  const isMessagesTab = currentTab === 'messages';

  return (
    <div
      className={cn(
        'bg-background text-foreground transition-colors flex flex-col',
        isMessagesTab
          ? 'h-[100dvh] max-h-[100dvh] overflow-hidden'
          : 'min-h-screen'
      )}
    >
      {/* Desktop Top Navigation */}
      <DesktopNav
        currentTab={currentTab}
        onTabChange={onTabChange}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onViewOwnProfile={onViewOwnProfile}
        activeTheme={activeTheme}
        onToggleTheme={onToggleTheme}
      />

      {/* Main Content Area */}
      <main
        className={cn(
          'w-full mx-auto',
          isMessagesTab
            ? 'flex-1 min-h-0 max-w-7xl px-2 sm:px-6 pt-2 sm:pt-4 pb-20 md:pb-4 overflow-hidden flex flex-col'
            : 'flex-1 max-w-6xl px-4 py-6 sm:px-6 mb-16 md:mb-8'
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentTab={currentTab}
        onTabChange={onTabChange}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Slide-Over Notification Drawer */}
      <NotificationDrawer
        open={isNotificationOpen}
        onOpenChange={setIsNotificationOpen}
        onNavigateToTarget={(url) => onNavigateToTargetUrl?.(url)}
      />

      {/* Global Command Palette / Search Modal */}
      <GlobalSearchModal
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onNavigateToUser={onNavigateToUser}
        onNavigateToProject={onNavigateToProject}
        onNavigateToPost={onNavigateToPost}
      />

      {/* Toast Notifications Provider */}
      <ToastContainer />
    </div>
  );
}
