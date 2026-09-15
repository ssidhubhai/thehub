import * as React from 'react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Textarea } from '@/components/primitives/Textarea';
import { Avatar } from '@/components/primitives/Avatar';
import { Badge } from '@/components/primitives/Badge';
import { toast } from '@/components/primitives/Toast';
import { useAuthStore } from '@/stores/useAuthStore';
import { getInitials } from '@/lib/utils';
import {
  Flame,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  BookOpen,
  Hammer,
} from 'lucide-react';
import { User } from '@/types/user';

export interface OnboardingWizardProps {
  onComplete?: (user: User) => void;
}

const PRESET_INTERESTS = [
  'AI',
  'Rust',
  'Design',
  'Compilers',
  'Distributed Systems',
  'WebGPU',
  'Hardware',
  'TypeScript',
  'Go',
  'Bioinformatics',
  'Security',
  'Creative Coding',
  'CRDTs',
  'Databases',
  'Robotics',
  'Solana',
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { user, completeOnboarding, isLoading } = useAuthStore();

  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3>(1);

  // Step 1: Identity
  const [displayName, setDisplayName] = React.useState(
    user?.profile.displayName || user?.username || ''
  );
  const [bio, setBio] = React.useState(user?.profile.bio || '');
  const [avatarUrl, setAvatarUrl] = React.useState(user?.profile.avatarUrl || '');
  const [step1Error, setStep1Error] = React.useState<string | null>(null);

  // Step 2: Interests
  const [interests, setInterests] = React.useState<string[]>(
    user?.profile.interests?.length ? user.profile.interests : ['AI', 'Rust']
  );
  const [customTag, setCustomTag] = React.useState('');
  const [step2Error, setStep2Error] = React.useState<string | null>(null);

  // Step 3: Focus
  const [currentlyLearning, setCurrentlyLearning] = React.useState(
    user?.profile.currentlyLearning || ''
  );
  const [currentlyBuilding, setCurrentlyBuilding] = React.useState(
    user?.profile.currentlyBuilding || ''
  );
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Synchronize initial state if user arrives late
  React.useEffect(() => {
    if (user) {
      if (!displayName) setDisplayName(user.profile.displayName || user.username);
      if (!bio && user.profile.bio) setBio(user.profile.bio);
      if (!avatarUrl && user.profile.avatarUrl) setAvatarUrl(user.profile.avatarUrl);
      if (user.profile.interests?.length && interests.length === 0) {
        setInterests(user.profile.interests);
      }
    }
  }, [user]);

  // Step 1 Validation & Proceed
  const handleStep1Next = () => {
    if (!displayName.trim()) {
      setStep1Error('Please provide a display name');
      return;
    }
    setStep1Error(null);
    setCurrentStep(2);
  };

  // Step 2 Tag Toggle & Add
  const togglePresetTag = (tag: string) => {
    setStep2Error(null);
    if (interests.includes(tag)) {
      setInterests(interests.filter((t) => t !== tag));
    } else {
      if (interests.length >= 10) {
        setStep2Error('Maximum 10 interest tags allowed');
        return;
      }
      setInterests([...interests, tag]);
    }
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customTag.trim().replace(/^#+/, '');
    if (!clean) return;

    if (interests.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setStep2Error(`"${clean}" is already in your interests`);
      return;
    }

    if (interests.length >= 10) {
      setStep2Error('Maximum 10 interest tags allowed');
      return;
    }

    setInterests([...interests, clean]);
    setCustomTag('');
    setStep2Error(null);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setInterests(interests.filter((t) => t !== tagToRemove));
  };

  const handleStep2Next = () => {
    if (interests.length === 0) {
      setStep2Error('Please select at least 1 interest tag so peers can discover you');
      return;
    }
    setStep2Error(null);
    setCurrentStep(3);
  };

  // Step 3 Completion
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    try {
      const updatedUser = await completeOnboarding({
        displayName: displayName.trim(),
        bio: bio.trim(),
        interests,
        currentlyLearning: currentlyLearning.trim(),
        currentlyBuilding: currentlyBuilding.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });

      // Show celebratory welcome toast
      toast.flame(
        'Welcome to The Hub!',
        `Your profile is ready, ${displayName.trim()}. You’ve been auto-enrolled into "The Hub — General" chat.`
      );

      onComplete?.(updatedUser);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to complete onboarding. Please try again.');
    }
  };

  const calculatedInitials = getInitials(displayName || user?.username || 'HB');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="mx-auto w-full max-w-xl space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background shadow-subtle mb-1">
            <Flame className="h-6 w-6 text-flame-500 fill-flame-500" />
          </div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Welcome to The Hub
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete this 3-step setup to establish your presence in the community.
          </p>
        </div>

        {/* Progress Bar & Indicators */}
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
            <span className={currentStep >= 1 ? 'text-foreground font-semibold' : ''}>
              1. Identity
            </span>
            <span className={currentStep >= 2 ? 'text-foreground font-semibold' : ''}>
              2. Interests
            </span>
            <span className={currentStep === 3 ? 'text-foreground font-semibold' : ''}>
              3. Focus
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-flame-500 transition-all duration-300 ease-out"
              style={{
                width: currentStep === 1 ? '33.3%' : currentStep === 2 ? '66.6%' : '100%',
              }}
            />
          </div>
        </div>

        {/* Main Card Container */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-subtle text-left space-y-6">
          {/* ================= STEP 1: IDENTITY ================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
                  Step 1: Your Builder Identity
                </h3>
                <p className="text-xs text-muted-foreground">
                  How should other student builders and collaborators know you?
                </p>
              </div>

              {step1Error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  {step1Error}
                </div>
              )}

              {/* Avatar Live Preview */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
                <Avatar
                  src={avatarUrl.trim() || undefined}
                  name={displayName || 'Builder'}
                  size="xl"
                  showPresence
                  isOnline
                />
                <div className="space-y-1 text-xs">
                  <p className="font-display font-bold text-sm text-foreground">
                    {displayName || 'Your Name'}
                  </p>
                  <p className="font-mono text-muted-foreground">
                    @{user?.username || 'handle'} • Initials: {calculatedInitials}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Avatar dynamically falls back to initials if no image is provided.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Display Name *"
                  id="onboarding-display-name"
                  placeholder="e.g. Maya Lin"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (step1Error) setStep1Error(null);
                  }}
                  leadingIcon={<UserIcon className="h-4 w-4" />}
                  required
                />

                <Input
                  label="Custom Avatar URL (Optional)"
                  id="onboarding-avatar-url"
                  placeholder="https://images.unsplash.com/..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  helperText="Leave empty to use your initials badge"
                />

                <Textarea
                  label="Short Bio"
                  id="onboarding-bio"
                  placeholder="Junior CS @ Berkeley. Compilers nerd, writing a typed bytecode VM in Rust..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={180}
                  helperText="Brief summary of what you care about (max 180 chars)"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  variant="flame"
                  size="md"
                  onClick={handleStep1Next}
                  iconSuffix={<ArrowRight className="h-4 w-4 ml-1" />}
                >
                  Next: Choose Interests
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: INTERESTS ================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
                  Step 2: Technical Interests
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pick the topics, languages, and tools you care about most.
                </p>
              </div>

              {step2Error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  {step2Error}
                </div>
              )}

              {/* Selected Tags Cloud */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground uppercase">
                    Your Selected Interests ({interests.length}/10)
                  </span>
                  {interests.length === 0 && (
                    <span className="text-flame-600 font-mono text-[11px]">Select at least 1</span>
                  )}
                </div>

                <div className="min-h-[48px] rounded-xl border border-border/80 bg-muted/20 p-3 flex flex-wrap gap-1.5 items-center">
                  {interests.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">
                      Click tags below or add your own...
                    </span>
                  ) : (
                    interests.map((tag) => (
                      <Badge
                        key={tag}
                        variant="flame"
                        size="md"
                        mono
                        removable
                        onRemove={() => handleRemoveTag(tag)}
                        className="py-1 px-2.5"
                      >
                        #{tag}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Custom Tag Input */}
              <form onSubmit={handleAddCustomTag} className="flex gap-2">
                <Input
                  id="custom-tag-input"
                  placeholder="Add custom tag (e.g. CUDA, Zig)..."
                  value={customTag}
                  onChange={(e) => {
                    setCustomTag(e.target.value);
                    if (step2Error) setStep2Error(null);
                  }}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="md"
                  iconPrefix={<Plus className="h-4 w-4" />}
                >
                  Add
                </Button>
              </form>

              {/* Preset Clickable Cloud */}
              <div className="space-y-2">
                <span className="font-mono text-xs text-muted-foreground uppercase">
                  Suggested Community Tags
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_INTERESTS.map((preset) => {
                    const isSelected = interests.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => togglePresetTag(preset)}
                        className={`rounded-full px-3 py-1 font-mono text-xs transition-all duration-150 border ${
                          isSelected
                            ? 'bg-foreground text-background border-foreground font-semibold shadow-subtle'
                            : 'bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                        }`}
                      >
                        #{preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-border/60">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setCurrentStep(1)}
                  iconPrefix={<ArrowLeft className="h-4 w-4 mr-1" />}
                >
                  Back
                </Button>

                <Button
                  variant="flame"
                  size="md"
                  onClick={handleStep2Next}
                  iconSuffix={<ArrowRight className="h-4 w-4 ml-1" />}
                >
                  Next: Current Focus
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: FOCUS ================= */}
          {currentStep === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
                  Step 3: What’s on your desk?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Share what you’re currently studying and building right now.
                </p>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  {submitError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-muted-foreground uppercase">
                    <BookOpen className="h-3.5 w-3.5 text-flame-500" />
                    <span>Currently Learning</span>
                  </div>
                  <Input
                    id="currently-learning-input"
                    placeholder="e.g. LLVM backend optimization passes & Triton kernel fusion"
                    value={currentlyLearning}
                    onChange={(e) => setCurrentlyLearning(e.target.value)}
                    helperText="Books, algorithms, languages, or papers on your radar"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-muted-foreground uppercase">
                    <Hammer className="h-3.5 w-3.5 text-flame-500" />
                    <span>Currently Building</span>
                  </div>
                  <Input
                    id="currently-building-input"
                    placeholder="e.g. Strobe — a zero-dependency typed bytecode VM in Rust"
                    value={currentlyBuilding}
                    onChange={(e) => setCurrentlyBuilding(e.target.value)}
                    helperText="Projects, tools, or open-source prototypes underway"
                  />
                </div>
              </div>

              {/* Automatic Enrollment Notice */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-mono font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Auto-Enrollment in "The Hub — General"</span>
                </div>
                <p className="text-muted-foreground">
                  Upon completing setup, your account will be activated and you’ll automatically
                  join the general community chat room.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setCurrentStep(2)}
                  iconPrefix={<ArrowLeft className="h-4 w-4 mr-1" />}
                >
                  Back
                </Button>

                <Button
                  type="submit"
                  variant="flame"
                  size="md"
                  isLoading={isLoading}
                  iconSuffix={<Sparkles className="h-4 w-4 ml-1" />}
                  className="shadow-glow-flame"
                >
                  Complete Setup & Enter The Hub
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
