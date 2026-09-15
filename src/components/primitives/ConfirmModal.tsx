import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './Dialog';
import { Button } from './Button';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
        );
      case 'warning':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-flame-500/10 text-flame-500 shrink-0">
            <Info className="h-5 w-5" />
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-w-md p-6 gap-5">
        <div className="flex items-start gap-4">
          {getIcon()}
          <div className="space-y-1 text-left flex-1 min-w-0">
            <DialogHeader>
              <DialogTitle className="text-base font-bold font-display text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 text-xs font-mono"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'destructive' : variant === 'warning' ? 'secondary' : 'flame'}
            size="sm"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className={cn(
              'px-4 text-xs font-mono font-medium',
              variant === 'danger' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm'
            )}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
