/**
 * Help Button Component
 * Trigger button for opening contextual help
 */

import React, { useCallback } from 'react';
import { useHelp } from '../HelpContext.js';
import type { HelpButtonProps } from '../types.js';

export function HelpButton({
  anchorKey,
  className = '',
  children,
}: HelpButtonProps): JSX.Element {
  const { openHelp, fetchContextualHelp, setCurrentArticle } = useHelp();

  const handleClick = useCallback(async () => {
    openHelp();

    if (anchorKey) {
      // Fetch contextual help for this anchor
      const currentPath = window.location.pathname;
      const result = await fetchContextualHelp(currentPath, anchorKey);
      if (result && result.articles.length > 0) {
        setCurrentArticle(result.articles[0]);
      }
    }
  }, [anchorKey, openHelp, fetchContextualHelp, setCurrentArticle]);

  const defaultStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid #ccc',
    background: '#f5f5f5',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={className ? undefined : defaultStyles}
      aria-label="Open help"
      title="Get help (press ? key)"
    >
      {children || '?'}
    </button>
  );
}
