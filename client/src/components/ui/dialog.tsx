import * as React from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
}

import { createPortal } from "react-dom";

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      <div className="z-[101] relative w-full flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full flex justify-center">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const DialogContent: React.FC<DialogContentProps> = ({ children, className = "" }) => {
  return (
    <div className={`relative bg-white rounded-lg shadow-lg w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto sm:max-w-2xl sm:mx-4 ${className}`}>
      {children}
    </div>
  );
};

export const DialogHeader: React.FC<DialogHeaderProps & { className?: string }> = ({ children, className = "" }) => {
  return (
    <div className={`flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10 ${className}`}>
      {children}
    </div>
  );
};

export const DialogTitle: React.FC<DialogTitleProps & { className?: string }> = ({ children, className = "" }) => {
  return (
    <h2 className={`text-xl sm:text-2xl font-bold ${className}`}>
      {children}
    </h2>
  );
};

export const DialogClose: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <button
      onClick={onClose}
      className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <X className="h-5 w-5" />
      <span className="sr-only">Close</span>
    </button>
  );
};
