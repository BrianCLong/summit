import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from './Button';
import { Tooltip, TooltipTrigger, TooltipContent } from './Tooltip';
import { isMac, cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative group w-full max-w-md", className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
      </div>
      <input
        ref={inputRef}
        type="text"
        className="block w-full pl-10 pr-16 py-2 bg-background border border-input rounded-md leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-all sm:text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search"
      />
      <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
        {value ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted"
                onClick={handleClear}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear search</TooltipContent>
          </Tooltip>
        ) : (
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">{isMac ? '⌘' : 'Ctrl'}</span>K
          </kbd>
        )}
      </div>
    </div>
  );
};
