import React from 'react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  shortcut?: string;
  loading?: boolean;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'h-8 text-xs pl-8 pr-3',
  md: 'h-10 text-sm pl-10 pr-4',
  lg: 'h-12 text-base pl-12 pr-5',
};

const iconSizes: Record<string, string> = {
  sm: 'w-3.5 h-3.5 left-2.5',
  md: 'w-4 h-4 left-3',
  lg: 'w-5 h-5 left-3.5',
};

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  size = 'md',
  shortcut,
  loading = false,
  className = '',
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit(value);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {loading ? (
        <svg className={`absolute top-1/2 -translate-y-1/2 ${iconSizes[size]} text-fg-tertiary animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className={`absolute top-1/2 -translate-y-1/2 ${iconSizes[size]} text-fg-tertiary`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={[
          `w-full bg-bg-secondary border border-border-default rounded-lg text-fg-primary placeholder-fg-tertiary`,
          `focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary/40`,
          `transition-all duration-fast`,
          sizeClasses[size],
        ].join(' ')}
      />
      {shortcut && (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-2xs text-fg-muted bg-bg-tertiary rounded border border-border-default font-mono">
          {shortcut}
        </kbd>
      )}
    </div>
  );
};
