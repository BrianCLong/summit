/**
 * Help Sidebar Component
 * Slide-out panel for displaying help content
 */

import React, { useEffect, useState } from 'react';
import { useHelp } from '../HelpContext.js';
import { HelpSearch } from './HelpSearch.js';
import { HelpArticleView } from './HelpArticleView.js';
import type { HelpSidebarProps, ContextualHelpResponse } from '../types.js';

export function HelpSidebar({ className = '', onClose }: HelpSidebarProps): JSX.Element | null {
  const {
    isOpen,
    closeHelp,
    currentArticle,
    setCurrentArticle,
    searchResults,
    fetchContextualHelp,
  } = useHelp();

  const [contextualHelp, setContextualHelp] = useState<ContextualHelpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch contextual help when sidebar opens
  useEffect(() => {
    if (isOpen && !currentArticle) {
      setIsLoading(true);
      const currentPath = window.location.pathname;
      fetchContextualHelp(currentPath)
        .then((result) => {
          setContextualHelp(result);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, currentArticle, fetchContextualHelp]);

  const handleClose = (): void => {
    closeHelp();
    onClose?.();
  };

  const handleBack = (): void => {
    setCurrentArticle(null);
  };

  if (!isOpen) {
    return null;
  }

  const sidebarStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '400px',
    maxWidth: '100vw',
    height: '100vh',
    backgroundColor: '#fff',
    boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f5f5f5',
  };

  const contentStyles: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  };

  const closeButtonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px',
    lineHeight: 1,
  };

  const articleListStyles: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  };

  const articleItemStyles: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid #e0e0e0',
    cursor: 'pointer',
  };

  const articlesToDisplay = searchResults.length > 0
    ? searchResults
    : contextualHelp?.articles || [];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999,
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={className}
        style={className ? undefined : sidebarStyles}
        role="complementary"
        aria-label="Help panel"
      >
        <header style={headerStyles}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            {currentArticle ? 'Help Article' : 'Help'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            style={closeButtonStyles}
            aria-label="Close help"
          >
            ×
          </button>
        </header>

        <div style={contentStyles}>
          {currentArticle ? (
            <HelpArticleView article={currentArticle} onBack={handleBack} />
          ) : (
            <>
              <HelpSearch
                onResultSelect={(article) => setCurrentArticle(article)}
              />

              {isLoading ? (
                <p style={{ textAlign: 'center', color: '#666' }}>Loading...</p>
              ) : (
                <>
                  {articlesToDisplay.length > 0 ? (
                    <>
                      <h3 style={{ fontSize: '14px', color: '#666', marginTop: '16px' }}>
                        {searchResults.length > 0 ? 'Search Results' : 'Suggested Help'}
                      </h3>
                      <ul style={articleListStyles}>
                        {articlesToDisplay.map((article) => (
                          <li
                            key={article.id}
                            style={articleItemStyles}
                            onClick={() => setCurrentArticle(article)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setCurrentArticle(article);
                            }}
                            tabIndex={0}
                            role="button"
                          >
                            <strong style={{ display: 'block', marginBottom: '4px' }}>
                              {article.title}
                            </strong>
                            {article.currentVersion?.summary && (
                              <span style={{ fontSize: '13px', color: '#666' }}>
                                {article.currentVersion.summary}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#666', marginTop: '24px' }}>
                      No help articles found for this page.
                      <br />
                      Try searching above.
                    </p>
                  )}

                  {contextualHelp?.suggestedSearches && contextualHelp.suggestedSearches.length > 0 && (
                    <>
                      <h3 style={{ fontSize: '14px', color: '#666', marginTop: '24px' }}>
                        Suggested Searches
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {contextualHelp.suggestedSearches.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              const { search, setSearchQuery } = useHelp();
                              setSearchQuery(suggestion);
                              search(suggestion);
                            }}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '16px',
                              border: '1px solid #ddd',
                              background: '#f9f9f9',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <footer
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e0e0e0',
            fontSize: '12px',
            color: '#666',
            textAlign: 'center',
          }}
        >
          Press <kbd style={{ background: '#eee', padding: '2px 6px', borderRadius: '3px' }}>?</kbd> to toggle help
        </footer>
      </aside>
    </>
  );
}
