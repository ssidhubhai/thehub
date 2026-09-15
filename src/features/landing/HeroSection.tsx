import * as React from 'react';
import { Button } from '@/components/primitives/Button';
import { ArrowRight, Sparkles, ShieldCheck, Terminal, Users, Layers } from 'lucide-react';

export interface HeroSectionProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  totalBuildersCount?: number;
  totalProjectsCount?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenRegister,
  onOpenLogin,
  totalBuildersCount = 8,
  totalProjectsCount = 4,
}) => {
  return (
    <section id="manifesto" className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      {/* Background Subtle Gradient Texture */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-flame-500/10 via-transparent to-transparent opacity-60 dark:opacity-40" />

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 space-y-8">
        {/* Ethos Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs shadow-subtle backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-flame-500" />
          <span className="font-mono uppercase tracking-wider text-muted-foreground">
            A Private Community for Serious Builders
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-flame-500" />
          <span className="font-mono text-[11px] text-flame-600 dark:text-flame-400 font-semibold">
            No Ads • High Trust
          </span>
        </div>

        {/* Hero Title with Bold Bricolage Grotesque Typography */}
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl text-foreground leading-[1.08]">
          Where ambitious young builders{' '}
          <span className="italic font-normal underline decoration-flame-500/60 decoration-wavy underline-offset-8">
            make things
          </span>{' '}
          together.
        </h1>

        {/* Manifesto Copy */}
        <p className="mx-auto max-w-2xl font-sans text-lg sm:text-xl text-muted-foreground leading-relaxed">
          The Hub is a quiet, editorial sanctuary for student engineers, designers, and researchers.
          Discover peers by what they’re actually learning and shipping, collaborate on real projects,
          chat without noise, and think out loud in the persistent Common Space.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Button
            variant="flame"
            size="lg"
            onClick={onOpenRegister}
            iconSuffix={<ArrowRight className="h-4 w-4 ml-1" />}
            className="w-full sm:w-auto px-8 py-3 text-base shadow-glow-flame"
          >
            Join The Hub
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-8 py-3 text-base font-medium"
          >
            Sign In with Username
          </Button>
        </div>

        {/* Platform Manifesto Highlights / Metrics */}
        <div className="pt-8 sm:pt-12 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div className="space-y-1 p-3 rounded-lg bg-card/50 border border-border/40">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs uppercase">
              <Users className="h-3.5 w-3.5" />
              <span>Builders</span>
            </div>
            <p className="font-display text-2xl font-bold tracking-tight text-foreground">
              {totalBuildersCount}+
            </p>
            <p className="text-[11px] text-muted-foreground">Handcrafted student profiles</p>
          </div>

          <div className="space-y-1 p-3 rounded-lg bg-card/50 border border-border/40">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs uppercase">
              <Layers className="h-3.5 w-3.5" />
              <span>Active Projects</span>
            </div>
            <p className="font-display text-2xl font-bold tracking-tight text-foreground">
              {totalProjectsCount}+
            </p>
            <p className="text-[11px] text-muted-foreground">Compilers, CRDTs, AI & design</p>
          </div>

          <div className="space-y-1 p-3 rounded-lg bg-card/50 border border-border/40">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs uppercase">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Hybrid DMs</span>
            </div>
            <p className="font-display text-2xl font-bold tracking-tight text-foreground">
              100%
            </p>
            <p className="text-[11px] text-muted-foreground">Mutual connection gated</p>
          </div>

          <div className="space-y-1 p-3 rounded-lg bg-card/50 border border-border/40">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs uppercase">
              <Terminal className="h-3.5 w-3.5" />
              <span>Resilience</span>
            </div>
            <p className="font-mono text-sm font-semibold text-flame-600 dark:text-flame-400 mt-2">
              Offline Mock Ready
            </p>
            <p className="text-[11px] text-muted-foreground">Zero external lock-in</p>
          </div>
        </div>
      </div>
    </section>
  );
};
