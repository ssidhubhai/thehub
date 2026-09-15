import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/primitives/Dialog';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/types/user';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
  onSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = React.useState<'login' | 'register'>(defaultTab);

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  const handleSuccess = (user: User) => {
    onSuccess?.(user);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md p-6 sm:p-8"
        onEscapeKeyDown={onClose}
        onPointerDownOutside={onClose}
      >
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background shadow-subtle">
              <Flame className="h-6 w-6 text-flame-500 fill-flame-500" />
            </div>
          </div>

          <DialogTitle className="text-center font-display text-2xl font-bold tracking-tight">
            {activeTab === 'login' ? 'Sign In to The Hub' : 'Join The Community'}
          </DialogTitle>

          <DialogDescription className="text-center text-xs text-muted-foreground">
            A private editorial network for student builders and researchers.
          </DialogDescription>

          {/* Accessible Tab Switcher */}
          <div
            role="tablist"
            aria-label="Authentication modes"
            className="grid grid-cols-2 rounded-lg bg-muted p-1 border border-border/60"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              onClick={() => setActiveTab('login')}
              className={cn(
                'rounded-md py-1.5 font-sans text-xs font-medium transition-all duration-150',
                activeTab === 'login'
                  ? 'bg-card text-foreground shadow-subtle'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              onClick={() => setActiveTab('register')}
              className={cn(
                'rounded-md py-1.5 font-sans text-xs font-medium transition-all duration-150',
                activeTab === 'register'
                  ? 'bg-card text-foreground shadow-subtle'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Create Account
            </button>
          </div>
        </DialogHeader>

        {/* Tab Content */}
        <div className="pt-2">
          {activeTab === 'login' ? (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToRegister={() => setActiveTab('register')}
            />
          ) : (
            <RegisterForm
              onSuccess={handleSuccess}
              onSwitchToLogin={() => setActiveTab('login')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
