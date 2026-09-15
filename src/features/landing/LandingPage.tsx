import * as React from 'react';
import { LandingHeader } from './LandingHeader';
import { HeroSection } from './HeroSection';
import { ValuePillars } from './ValuePillars';
import { ShowcaseCards } from './ShowcaseCards';
import { LandingFooter } from './LandingFooter';
import { AuthModal } from '@/features/auth/AuthModal';
import { User } from '@/types/user';

export interface LandingPageProps {
  onAuthSuccess?: (user: User) => void;
  activeTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onAuthSuccess,
  activeTheme = 'light',
  onToggleTheme,
}) => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authTab, setAuthTab] = React.useState<'login' | 'register'>('register');

  const handleOpenLogin = () => {
    setAuthTab('login');
    setAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthTab('register');
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background transition-colors flex flex-col">
      {/* Public Sticky Header */}
      <LandingHeader
        onOpenLogin={handleOpenLogin}
        onOpenRegister={handleOpenRegister}
        activeTheme={activeTheme}
        onToggleTheme={onToggleTheme}
      />

      {/* Main Page Flow */}
      <main className="flex-1">
        {/* Bold Editorial Hero */}
        <HeroSection
          onOpenRegister={handleOpenRegister}
          onOpenLogin={handleOpenLogin}
        />

        {/* 4 Editorial Value Pillars */}
        <ValuePillars />

        {/* Live Community Showcase Cards */}
        <ShowcaseCards onJoinClick={handleOpenRegister} />
      </main>

      {/* Editorial Footer */}
      <LandingFooter />

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authTab}
        onSuccess={onAuthSuccess}
      />
    </div>
  );
};
