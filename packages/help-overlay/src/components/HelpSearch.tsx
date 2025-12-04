/**
 * Help Search Component
 * Search input for KB content
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useHelp } from '../HelpContext.js';
import type { HelpSearchProps, HelpArticle } from '../types.js';

export function HelpSearch({
  placeholder = 'Search help...',
  className = '',
  onResultSelect,
}: HelpSearchProps): JSX.Element {
  const { searchQuery, setSearchQuery, search, isSearching } = useHelp();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchQuery(value);

      // Debounce search
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        search(value);
      }, 300);
    },
    [setSearchQuery, search]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        setSearchQuery('');
        inputRef.current?.blur();
      }
    },
    [setSearchQuery]
  );

  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const containerStyles: React.CSSProperties = {
    position: 'relative',
  };

  return (
    <div className={className} style={className ? undefined : containerStyles}>
      <input
        ref={inputRef}
        type="search"
        value={searchQuery}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={inputStyles}
        aria-label="Search help"
      />
      {isSearching && (
        <span
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            color: '#666',
          }}
        >
          Searching...
        </span>
      )}
    </div>
  );
}
