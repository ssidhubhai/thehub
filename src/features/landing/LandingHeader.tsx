import * as React from 'react';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { Flame, Moon, Sun, ArrowRight } from 'lucide-react';

export interface LandingHeaderProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  activeTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onOpenLogin,
  onOpenRegister,
  activeTheme = 'light',
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background shadow-subtle">
            <Flame className="h-5 w-5 text-flame-500 fill-flame-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              The Hub
            </span>
            <Badge variant="outline" size="sm" mono className="hidden sm:inline-flex text-[10px] uppercase">
              Editorial
            </Badge>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 font-sans text-sm text-muted-foreground">
          <a
            href="#manifesto"
            className="transition-colors hover:text-foreground hover:underline underline-offset-4"
          >
            Manifesto
          </a>
          <a
            href="#pillars"
            className="transition-colors hover:text-foreground hover:underline underline-offset-4"
          >
            Pillars
          </a>
          <a
            href="#showcase"
            className="transition-colors hover:text-foreground hover:underline underline-offset-4"
          >
            Showcase
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleTheme && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              className="px-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {activeTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenLogin}
            className="font-medium text-foreground hover:bg-muted"
          >
            Sign In
          </Button>

          <Button
            variant="flame"
            size="sm"
            onClick={onOpenRegister}
            iconSuffix={<ArrowRight className="h-3.5 w-3.5 ml-0.5" />}
          >
            Join The Hub
          </Button>
        </div>
      </div>
    </header>
  );
};
