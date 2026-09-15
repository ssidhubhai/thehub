import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, Flame, X, AlertTriangle } from 'lucide-react';

export type ToastVariant = 'default' | 'success' | 'error' | 'info' | 'warning' | 'flame';

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  add(toast: Omit<ToastItem, 'id'>): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastItem = { ...toast, id };
    this.toasts = [...this.toasts, newToast];
    this.notify();

    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
    return id;
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clear(): void {
    this.toasts = [];
    this.notify();
  }
}

export const toastManager = new ToastManager();

export const toast = (options: Omit<ToastItem, 'id'>) => {
  return toastManager.add(options);
};

toast.success = (title: string, description?: string) =>
  toastManager.add({ title, description, variant: 'success' });

toast.error = (title: string, description?: string) =>
  toastManager.add({ title, description, variant: 'error' });

toast.info = (title: string, description?: string) =>
  toastManager.add({ title, description, variant: 'info' });

toast.warning = (title: string, description?: string) =>
  toastManager.add({ title, description, variant: 'warning' });

toast.flame = (title: string, description?: string) =>
  toastManager.add({ title, description, variant: 'flame' });

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  return {
    toasts,
    toast,
    dismiss: (id: string) => toastManager.dismiss(id),
  };
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  const getIcon = (variant?: ToastVariant) => {
    switch (variant) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'flame':
        return <Flame className="h-4 w-4 text-flame-500 fill-flame-500 shrink-0" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-float bg-card text-card-foreground transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in-0',
            t.variant === 'flame' && 'border-flame-300 dark:border-flame-800/80 bg-flame-50/50 dark:bg-flame-950/20',
            t.variant === 'error' && 'border-destructive/40 bg-destructive/5',
            t.variant === 'success' && 'border-emerald-200 dark:border-emerald-800/60'
          )}
        >
          {getIcon(t.variant)}
          <div className="flex-1 text-left space-y-0.5">
            {t.title && <p className="text-sm font-semibold leading-tight">{t.title}</p>}
            {t.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss toast"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
