import React from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'underline' | 'pill' | 'segment';
  size?: 'sm' | 'md';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, variant = 'underline', size = 'md', className = '' }) => {
  const sizeClass = size === 'sm' ? 'text-xs h-8' : 'text-sm h-10';

  if (variant === 'pill') {
    return (
      <div className={`flex items-center gap-1 ${className}`} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            disabled={tab.disabled}
            onClick={() => onTabChange(tab.id)}
            className={[
              `inline-flex items-center gap-1.5 px-3 ${sizeClass} rounded-md font-medium transition-all duration-fast`,
              activeTab === tab.id
                ? 'bg-brand-primary/15 text-brand-primary'
                : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-surfaceHover',
              tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span className="ml-1 px-1.5 py-0.5 text-2xs rounded-full bg-bg-tertiary text-fg-secondary">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'segment') {
    return (
      <div className={`flex items-center bg-bg-secondary rounded-lg p-1 ${className}`} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            disabled={tab.disabled}
            onClick={() => onTabChange(tab.id)}
            className={[
              `flex-1 inline-flex items-center justify-center gap-1.5 px-3 ${sizeClass} rounded-md font-medium transition-all duration-fast`,
              activeTab === tab.id
                ? 'bg-bg-surface text-fg-primary shadow-sm'
                : 'text-fg-secondary hover:text-fg-primary',
              tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  // Default: underline
  return (
    <div className={`flex items-center gap-0 border-b border-border-default ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          disabled={tab.disabled}
          onClick={() => onTabChange(tab.id)}
          className={[
            `inline-flex items-center gap-1.5 px-4 ${sizeClass} font-medium transition-all duration-fast border-b-2 -mb-px`,
            activeTab === tab.id
              ? 'border-brand-primary text-fg-primary'
              : 'border-transparent text-fg-secondary hover:text-fg-primary hover:border-fg-muted',
            tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && (
            <span className="ml-1 px-1.5 py-0.5 text-2xs rounded-full bg-bg-tertiary text-fg-secondary">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
};
