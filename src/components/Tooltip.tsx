import React, { useState } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l border-t',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t border-r',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-b border-l'
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses[position]} z-50 px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900/95 backdrop-blur-xs rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-150 border border-slate-700/50 flex items-center gap-1.5`}
        >
          <span>{content}</span>
          <div
            className={`absolute w-1.5 h-1.5 bg-slate-900/95 rotate-45 border-slate-700/50 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
};
