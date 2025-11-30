/**
 * Help Article View Component
 * Displays a single help article
 */

import React from 'react';
import type { HelpArticleViewProps } from '../types.js';

export function HelpArticleView({ article, onBack }: HelpArticleViewProps): JSX.Element {
  const backButtonStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    padding: '8px 0',
    cursor: 'pointer',
    color: '#0066cc',
    fontSize: '14px',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    margin: '16px 0 8px',
    color: '#333',
  };

  const metaStyles: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  };

  const tagStyles: React.CSSProperties = {
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#e8f4fc',
    color: '#0066cc',
    fontSize: '12px',
  };

  const contentStyles: React.CSSProperties = {
    lineHeight: 1.6,
    color: '#333',
  };

  return (
    <article>
      {onBack && (
        <button type="button" onClick={onBack} style={backButtonStyles}>
          ← Back to help
        </button>
      )}

      <h1 style={titleStyles}>{article.title}</h1>

      {article.tags && article.tags.length > 0 && (
        <div style={metaStyles}>
          {article.tags.map((tag) => (
            <span key={tag.slug} style={tagStyles}>
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {article.currentVersion?.contentHtml ? (
        <div
          style={contentStyles}
          dangerouslySetInnerHTML={{ __html: article.currentVersion.contentHtml }}
        />
      ) : article.currentVersion?.content ? (
        <div style={contentStyles}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
            {article.currentVersion.content}
          </pre>
        </div>
      ) : (
        <p style={{ color: '#666' }}>No content available.</p>
      )}
    </article>
  );
}
