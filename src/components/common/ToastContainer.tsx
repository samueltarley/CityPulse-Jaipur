import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ToastNotification } from '../../types';
import { Check, X } from 'lucide-react';

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Begin smooth fade-out at 1700ms, then complete dismiss at 2000ms
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1700);

    const dismissTimer = setTimeout(() => {
      onDismiss(toast.id);
    }, 2000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, onDismiss]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFadingOut(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 120);
  };

  return (
    <div
      className={`pointer-events-auto w-[280px] p-3 rounded-xl border border-[#CCF1F4] dark:border-[#521E3B] bg-white dark:bg-[#280D1F] text-[#0F3E48] dark:text-[#FFD1DC] shadow-[0_4px_16px_rgba(15,62,72,0.12)] dark:shadow-none flex items-center justify-between gap-2.5 transition-all duration-300 ${
        isFadingOut
          ? 'opacity-0 scale-95 translate-y-1'
          : 'opacity-100 scale-100 translate-y-0 animate-in fade-in slide-in-from-bottom-2 duration-200'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
          <Check className="h-3 w-3 stroke-[3]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate leading-tight">
            {toast.message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleClose}
        className="p-1 rounded-lg text-[#3E6B75] dark:text-[#E3B0C4] hover:text-[#0F3E48] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};
