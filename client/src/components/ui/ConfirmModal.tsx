import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md p-6">
        <DialogHeader className="border-b-0 pb-0">
          <div className="flex items-center gap-3">
            {variant === 'danger' && (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <DialogTitle className="text-xl text-foreground border-none">{title}</DialogTitle>
          </div>
          <DialogClose onClose={onClose} />
        </DialogHeader>
        
        <div className="pt-2 pb-6 px-1 text-sm text-muted-foreground">
          {description}
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {cancelText}
          </Button>
          <Button
            type="button"
            className={`w-full sm:w-auto ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200 dark:shadow-none' : ''}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
