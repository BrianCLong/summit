import React from 'react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: 'left' | 'right';
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ open, onClose, title, side = 'right', width = '400px', children, footer }) => {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const positionClass = side === 'right' ? 'right-0' : 'left-0';
  const slideClass = side === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  return (
    <div className="fixed inset-0 z-modal flex">
      <div className="absolute inset-0 bg-bg-overlay" onClick={onClose} />
      <div
        className={`absolute top-0 bottom-0 ${positionClass} ${slideClass} bg-bg-elevated border-l border-border-default shadow-xl flex flex-col`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
            <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
            <button onClick={onClose} className="text-fg-tertiary hover:text-fg-primary transition-colors p-1 rounded hover:bg-bg-surfaceHover">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-border-default shrink-0">{footer}</div>}
      </div>
    </div>
  );
};
