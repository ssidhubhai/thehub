import * as React from 'react';
import { Users, FolderGit2, MessageSquare, Flame } from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';

interface ValuePillarItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  icon: React.ElementType;
  bulletPoints: string[];
}

const PILLARS: ValuePillarItem[] = [
  {
    id: 'people-discovery',
    tag: 'PEOPLE DISCOVERY',
    title: 'Find builders on your wavelength',
    description:
      'Search members by technical obsessions, current reading lists, and active repositories. No vanity metrics or follower counters—just genuine craft.',
    icon: Users,
    bulletPoints: [
      'Multi-field search across bio & interests',
      'Discover what peers are currently learning',
      'Hybrid connection gate for high-trust contact',
    ],
  },
  {
    id: 'projects',
    tag: 'PROJECTS & ROSTERS',
    title: 'Ship together, not alone',
    description:
      'Collaborate on student-driven experiments. Browse open roles marked with skill tags and send structured interest pitches directly to project creators.',
    icon: FolderGit2,
    bulletPoints: [
      'Browse projects by open contributor roles',
      'Pitch interest notes without automatic membership',
      'Dedicated project devlogs and discussion threads',
    ],
  },
  {
    id: 'messaging',
    tag: 'CALM MESSAGING',
    title: 'Zero-noise direct & group chatter',
    description:
      'Clean message grouping, IBM Plex Mono timestamps, and mutual connection requirements ensure your inbox remains focused and free of spam.',
    icon: MessageSquare,
    bulletPoints: [
      'Auto-enrolled "The Hub — General" chatter',
      'Mutual connection unlocked private DMs',
      'Real-time active presence indicator',
    ],
  },
  {
    id: 'common-space',
    tag: 'COMMON SPACE',
    title: 'Persistent community discourse',
    description:
      'A chronological, algorithmic-free common room for technical breakthroughs, RFCs, and late-night queries. Thoughtful discourse with a single fire reaction.',
    icon: Flame,
    bulletPoints: [
      'Chronological feed without algorithmic feeds',
      'Single 🔥 toggle reactions with micro-animation',
      'Flat 1-level reply threads with @mentions',
    ],
  },
];

export const ValuePillars: React.FC = () => {
  return (
    <section id="pillars" className="py-16 sm:py-24 border-t border-border/70 bg-card/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="outline" size="sm" mono className="uppercase tracking-wider">
            Architecture of The Hub
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Four foundational pillars built for deep focus.
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Every feature is intentionally shaped to encourage genuine student collaboration
            while rejecting vanity metrics and endless algorithmic feeds.
          </p>
        </div>

        {/* 4-Pillar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-subtle hover:shadow-float hover:border-foreground/25 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Icon Box */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Tag */}
                  <div>
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-flame-600 dark:text-flame-400">
                      {pillar.tag}
                    </span>
                    <h3 className="font-display text-xl font-bold tracking-tight text-foreground mt-1">
                      {pillar.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                {/* Bullet Points */}
                <div className="pt-6 mt-6 border-t border-border/60">
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {pillar.bulletPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-flame-500 mt-1.5 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
