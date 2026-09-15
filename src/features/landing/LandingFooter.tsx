import * as React from 'react';
import { Flame } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-border/80 bg-card/40 py-12 text-muted-foreground text-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
                <Flame className="h-4 w-4 text-flame-500 fill-flame-500" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">The Hub</span>
            </div>
            <p className="max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
              A private, quiet sanctuary for students and young builders. Focused on
              deep technical curiosity, collaborative projects, calm messaging, and persistent
              common space discourse.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span>All Systems Operational • Local-First Architecture</span>
            </div>
          </div>

          {/* Pillars Col */}
          <div className="space-y-3">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
              Platform
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#manifesto" className="hover:text-foreground transition-colors">
                  Manifesto
                </a>
              </li>
              <li>
                <a href="#pillars" className="hover:text-foreground transition-colors">
                  People Directory
                </a>
              </li>
              <li>
                <a href="#pillars" className="hover:text-foreground transition-colors">
                  Project Rosters
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-foreground transition-colors">
                  Common Space
                </a>
              </li>
            </ul>
          </div>

          {/* Ethos Col */}
          <div className="space-y-3">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
              Community Ethos
            </p>
            <ul className="space-y-2 text-xs">
              <li className="text-muted-foreground hover:text-foreground cursor-default">
                Zero algorithmic manipulation
              </li>
              <li className="text-muted-foreground hover:text-foreground cursor-default">
                High-trust mutual connection DMs
              </li>
              <li className="text-muted-foreground hover:text-foreground cursor-default">
                Focus over follower counts
              </li>
              <li className="text-muted-foreground hover:text-foreground cursor-default">
                Code & design craft first
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <p>© 2026 The Hub. Designed for focused minds.</p>
          <p className="flex items-center gap-1 text-muted-foreground">
            Built with craft for young builders worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
};
