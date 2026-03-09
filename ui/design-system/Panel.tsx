import React from 'react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  noPadding?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  actions,
  collapsible = false,
  defaultCollapsed = false,
  noPadding = false,
  children,
  className = '',
  ...props
}) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className={`bg-bg-surface border border-border-default rounded-lg overflow-hidden ${className}`} {...props}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            {collapsible && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="text-fg-secondary hover:text-fg-primary transition-colors"
                aria-label={collapsed ? 'Expand' : 'Collapse'}
              >
                <svg className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <div>
              {title && <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>}
              {subtitle && <p className="text-xs text-fg-secondary mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {!collapsed && <div className={noPadding ? '' : 'p-4'}>{children}</div>}
    </div>
  );
};
