import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { StaffLoginForm } from './StaffLoginForm';
import { X } from 'lucide-react';

export const StaffLoginModal: React.FC = () => {
  const { isStaffAuthModalOpen, setIsStaffAuthModalOpen, role, setActiveTab } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStaffAuthModalOpen) {
        setIsStaffAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStaffAuthModalOpen, setIsStaffAuthModalOpen]);

  // If already staff or modal is closed, do not render
  if (!isStaffAuthModalOpen || role === 'staff') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[var(--jaipur-surface)] rounded-3xl border-2 border-[var(--jaipur-terracotta)]/40 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsStaffAuthModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-[var(--jaipur-text-muted)] hover:text-[var(--jaipur-text)] hover:bg-[var(--jaipur-surface-warm)] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Form Body */}
        <StaffLoginForm
          isModal={true}
          onSuccess={() => {
            setActiveTab('staff');
            setIsStaffAuthModalOpen(false);
          }}
          onCancel={() => {
            setIsStaffAuthModalOpen(false);
          }}
        />
      </div>
    </div>
  );
};
