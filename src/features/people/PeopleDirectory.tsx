import * as React from 'react';
import { usePeopleStore } from '@/stores/usePeopleStore';
import { PersonCard } from '@/components/shared/PersonCard';
import { Button, Skeleton, EmptyState } from '@/components/primitives';
import { Search, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PeopleDirectoryProps {
  onSelectPerson: (userId: string) => void;
  onOpenDirectChat?: (userId: string) => void;
}

export function PeopleDirectory({
  onSelectPerson,
  onOpenDirectChat,
}: PeopleDirectoryProps) {
  const {
    people,
    fetchPeople,
    fetchConnections,
    searchQuery,
    setSearchQuery,
    selectedInterests,
    toggleInterest,
    clearFilters,
    isLoading,
  } = usePeopleStore();

  React.useEffect(() => {
    fetchPeople();
    fetchConnections();
  }, [fetchPeople, fetchConnections]);

  // Extract all unique interest tags across all users
  const popularTags = React.useMemo(() => {
    const counts: Record<string, number> = {};
    people.forEach((p) => {
      p.profile.interests?.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [people]);

  // Filtered people
  const filteredPeople = React.useMemo(() => {
    return people.filter((p) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.profile.displayName.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.profile.bio.toLowerCase().includes(q) ||
        p.profile.interests?.some((t) => t.toLowerCase().includes(q)) ||
        p.profile.currentlyBuilding?.toLowerCase().includes(q) ||
        p.profile.currentlyLearning?.toLowerCase().includes(q);

      // Interest tag filter
      const matchesTags =
        selectedInterests.length === 0 ||
        selectedInterests.every((tag) => p.profile.interests?.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [people, searchQuery, selectedInterests]);

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedInterests.length > 0);

  return (
    <div className="space-y-8 text-left max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-flame-500" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Directory
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              People
            </h1>
            <p className="text-sm text-muted-foreground font-sans mt-1">
              Find someone interesting. Reach out, learn what they're building, and connect.
            </p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {filteredPeople.length} {filteredPeople.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* Controls: Search & Interest Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, handle, bio, or interests..."
            className={cn(
              'w-full rounded-xl border border-border bg-card pl-10 pr-10 py-2.5 text-sm text-foreground',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-flame-500/50 shadow-subtle'
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Popular Interest Tags (F46) */}
        {popularTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="font-mono text-xs text-muted-foreground mr-1">Popular:</span>
            {popularTags.map((tag) => {
              const isSelected = selectedInterests.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleInterest(tag)}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-mono transition-all border',
                    isSelected
                      ? 'bg-foreground text-background border-foreground font-semibold'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted'
                  )}
                >
                  #{tag}
                </button>
              );
            })}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 px-2 text-[11px] font-mono text-muted-foreground hover:text-destructive ml-1"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* People Grid (F44) */}
      {isLoading && people.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : filteredPeople.length === 0 ? (
        <EmptyState
          title="No builders match your search"
          description="Try modifying your search keywords or clearing the interest filters."
          actionLabel="Clear All Filters"
          onAction={clearFilters}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPeople.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onSelect={onSelectPerson}
              onOpenDirectChat={onOpenDirectChat}
            />
          ))}
        </div>
      )}
    </div>
  );
}
