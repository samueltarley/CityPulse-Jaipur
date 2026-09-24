import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  title?: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  title,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#D9707E]/15 hover:bg-[#D9707E]/25 text-[#0891B2] dark:text-[#FFD1DC] transition-colors cursor-pointer"
        aria-label="More information"
        title="Click to read what this means"
      >
        <Info className="h-3 w-3" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 sm:w-72 p-3 rounded-2xl bg-[#F0FCFD] dark:bg-[#280D1F] border border-[#80DEEA] dark:border-[#521E3B] text-xs text-[#1F4E5A] dark:text-[#FFF0F5] shadow-xl shadow-[#0891B2]/10 z-50 animate-in fade-in zoom-in-95 pointer-events-auto"
        >
          {title && (
            <div className="font-bold text-[#0F3E48] dark:text-[#FFD1DC] mb-1 flex items-center justify-between">
              <span>{title}</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#3E6B75] hover:text-[#0F3E48] p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <p className="leading-relaxed font-normal">{content}</p>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#F0FCFD] dark:border-t-[#280D1F]" />
        </div>
      )}
    </div>
  );
};
