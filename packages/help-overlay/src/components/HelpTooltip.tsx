/**
 * Help Tooltip Component
 * Inline help tooltip that appears on hover/focus
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useHelp } from '../HelpContext.js';
import type { HelpTooltipProps, HelpArticle } from '../types.js';

export function HelpTooltip({
  anchorKey,
  children,
  placement = 'top',
}: HelpTooltipProps): JSX.Element {
  const { fetchContextualHelp, setCurrentArticle, openHelp } = useHelp();
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipContent, setTooltipContent] = useState<HelpArticle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchContent = useCallback(async () => {
    if (tooltipContent) return; // Already loaded

    setIsLoading(true);
    try {
      const currentPath = window.location.pathname;
      const result = await fetchContextualHelp(currentPath, anchorKey);
      if (result && result.articles.length > 0) {
        setTooltipContent(result.articles[0]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [anchorKey, fetchContextualHelp, tooltipContent]);

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      fetchContent();
    }, 300);
  }, [fetchContent]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const handleClick = useCallback(() => {
    if (tooltipContent) {
      setCurrentArticle(tooltipContent);
      openHelp();
    }
  }, [tooltipContent, setCurrentArticle, openHelp]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  };

  const iconStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    marginLeft: '4px',
    borderRadius: '50%',
    backgroundColor: '#e0e0e0',
    color: '#666',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  };

  const getTooltipPosition = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1001,
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      padding: '12px',
      width: '250px',
      maxWidth: '90vw',
    };

    switch (placement) {
      case 'top':
        return { ...base, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' };
      case 'bottom':
        return { ...base, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' };
      case 'left':
        return { ...base, right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' };
      case 'right':
        return { ...base, left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' };
      default:
        return base;
    }
  };

  return (
    <span
      ref={containerRef}
      style={containerStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <span
        style={iconStyles}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        tabIndex={0}
        role="button"
        aria-label="Help"
      >
        ?
      </span>

      {isVisible && (
        <div style={getTooltipPosition()} role="tooltip">
          {isLoading ? (
            <span style={{ color: '#666', fontSize: '13px' }}>Loading...</span>
          ) : tooltipContent ? (
            <>
              <strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                {tooltipContent.title}
              </strong>
              {tooltipContent.currentVersion?.summary && (
                <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                  {tooltipContent.currentVersion.summary}
                </p>
              )}
              <button
                type="button"
                onClick={handleClick}
                style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Read more
              </button>
            </>
          ) : (
            <span style={{ color: '#666', fontSize: '13px' }}>
              No help available
            </span>
          )}
        </div>
      )}
    </span>
  );
}
