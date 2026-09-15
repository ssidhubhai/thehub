import * as React from 'react';
import { Input } from '@/components/primitives/Input';
import { Button } from '@/components/primitives/Button';
import { useAuthStore } from '@/stores/useAuthStore';
import { User as UserIcon, Lock, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { User } from '@/types/user';

export interface RegisterFormProps {
  onSuccess?: (user: User) => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);

  const { register, isLoading, error: storeError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setFormError('Please choose a username');
      return;
    }

    if (cleanUsername.length < 3) {
      setFormError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setFormError('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (password && password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    if (password && confirmPassword && password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      const newUser = await register(cleanUsername, password || undefined);
      onSuccess?.(newUser);
    } catch (err: any) {
      setFormError(err?.message || 'Registration failed');
    }
  };

  const displayError = formError || storeError;

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-left">
        <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
          Join The Hub
        </h3>
        <p className="text-xs text-muted-foreground">
          Claim your unique handle. No email address, spam, or tracking.
        </p>
      </div>

      {displayError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="leading-snug">{displayError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <Input
          label="Username / Handle"
          id="register-username"
          placeholder="e.g. dev_sarah"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (formError) setFormError(null);
          }}
          leadingIcon={<UserIcon className="h-4 w-4" />}
          helperText="Lowercase letters, numbers, and underscores only"
          autoFocus
          required
        />

        <Input
          label="Password"
          id="register-password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (formError) setFormError(null);
          }}
          leadingIcon={<Lock className="h-4 w-4" />}
          required
        />

        <Input
          label="Confirm Password"
          id="register-confirm-password"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (formError) setFormError(null);
          }}
          leadingIcon={<ShieldCheck className="h-4 w-4" />}
          required
        />

        <Button
          type="submit"
          variant="flame"
          size="md"
          className="w-full justify-center"
          isLoading={isLoading}
          iconSuffix={<ArrowRight className="h-4 w-4 ml-1" />}
        >
          Create Account & Start Onboarding
        </Button>
      </form>

      {onSwitchToLogin && (
        <div className="pt-2 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-foreground underline underline-offset-4 hover:text-flame-600 dark:hover:text-flame-400"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );
};
