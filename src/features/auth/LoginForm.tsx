import * as React from 'react';
import { Input } from '@/components/primitives/Input';
import { Button } from '@/components/primitives/Button';
import { useAuthStore } from '@/stores/useAuthStore';
import { User as UserIcon, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { User } from '@/types/user';

export interface LoginFormProps {
  onSuccess?: (user: User) => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
}) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);

  const { login, isLoading, error: storeError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setFormError('Please enter your username');
      return;
    }

    try {
      const user = await login(cleanUsername, password || undefined);
      onSuccess?.(user);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to sign in');
    }
  };

  const displayError = formError || storeError;

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-left">
        <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
          Welcome back to The Hub
        </h3>
        <p className="text-xs text-muted-foreground">
          Enter your unique username and password to sign in. No email required.
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
          label="Username"
          id="login-username"
          placeholder="e.g. maya_lin"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (formError) setFormError(null);
          }}
          leadingIcon={<UserIcon className="h-4 w-4" />}
          autoFocus
          required
        />

        <Input
          label="Password"
          id="login-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (formError) setFormError(null);
          }}
          leadingIcon={<Lock className="h-4 w-4" />}
          helperText="Leave blank if registering in mock demo mode"
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full justify-center"
          isLoading={isLoading}
          iconSuffix={<ArrowRight className="h-4 w-4 ml-1" />}
        >
          Sign In
        </Button>
      </form>

      {onSwitchToRegister && (
        <div className="pt-2 text-center text-xs text-muted-foreground">
          New to the community?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-foreground underline underline-offset-4 hover:text-flame-600 dark:hover:text-flame-400"
          >
            Create an account
          </button>
        </div>
      )}
    </div>
  );
};
