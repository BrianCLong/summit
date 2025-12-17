/**
 * Credibility Badge Component
 *
 * Displays source credibility rating using Admiralty/NATO system.
 */

import React from 'react';
import type { CredibilityRating, InformationRating } from '../constants.js';
import { CREDIBILITY_RATINGS, INFORMATION_RATINGS } from '../constants.js';

export interface CredibilityBadgeProps {
  sourceRating: CredibilityRating;
  infoRating?: InformationRating;
  score?: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showScore?: boolean;
}

const getRatingColor = (rating: CredibilityRating): string => {
  const colors: Record<CredibilityRating, string> = {
    A: '#10b981', // Green - Completely reliable
    B: '#22c55e', // Light green - Usually reliable
    C: '#f59e0b', // Amber - Fairly reliable
    D: '#f97316', // Orange - Not usually reliable
    E: '#ef4444', // Red - Unreliable
    F: '#6b7280', // Gray - Cannot be judged
  };
  return colors[rating];
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
};

export const CredibilityBadge: React.FC<CredibilityBadgeProps> = ({
  sourceRating,
  infoRating,
  score,
  size = 'medium',
  showLabel = true,
  showScore = false,
}) => {
  const ratingInfo = CREDIBILITY_RATINGS[sourceRating];
  const infoRatingInfo = infoRating ? INFORMATION_RATINGS[infoRating] : null;

  const sizeClasses: Record<string, string> = {
    small: 'badge-small',
    medium: 'badge-medium',
    large: 'badge-large',
  };

  return (
    <div className={`credibility-badge ${sizeClasses[size]}`}>
      {/* Source Rating */}
      <div
        className="rating-circle source-rating"
        style={{ backgroundColor: getRatingColor(sourceRating) }}
        title={ratingInfo.label}
      >
        {sourceRating}
      </div>

      {/* Information Rating (if provided) */}
      {infoRating && infoRatingInfo && (
        <div
          className="rating-circle info-rating"
          style={{
            backgroundColor: getScoreColor(infoRatingInfo.score),
          }}
          title={infoRatingInfo.label}
        >
          {infoRating}
        </div>
      )}

      {/* Combined display for Admiralty format */}
      {infoRating && (
        <span className="rating-combined">
          {sourceRating}
          {infoRating}
        </span>
      )}

      {/* Labels */}
      {showLabel && (
        <div className="rating-labels">
          <span className="source-label">{ratingInfo.label}</span>
          {infoRatingInfo && (
            <span className="info-label">{infoRatingInfo.label}</span>
          )}
        </div>
      )}

      {/* Score bar */}
      {showScore && score !== undefined && (
        <div className="score-display">
          <div className="score-bar">
            <div
              className="score-fill"
              style={{
                width: `${score}%`,
                backgroundColor: getScoreColor(score),
              }}
            />
          </div>
          <span className="score-value">{score}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Inline credibility display for lists/tables
 */
export interface CredibilityInlineProps {
  sourceRating: CredibilityRating;
  infoRating?: InformationRating;
}

export const CredibilityInline: React.FC<CredibilityInlineProps> = ({
  sourceRating,
  infoRating,
}) => {
  return (
    <span
      className="credibility-inline"
      style={{ color: getRatingColor(sourceRating) }}
      title={`${CREDIBILITY_RATINGS[sourceRating].label}${
        infoRating ? ` / ${INFORMATION_RATINGS[infoRating].label}` : ''
      }`}
    >
      {sourceRating}
      {infoRating || ''}
    </span>
  );
};

/**
 * Credibility trend indicator
 */
export interface CredibilityTrendProps {
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  previousScore?: number;
  currentScore?: number;
}

export const CredibilityTrend: React.FC<CredibilityTrendProps> = ({
  trend,
  previousScore,
  currentScore,
}) => {
  const trendConfig = {
    IMPROVING: { icon: '↑', color: '#10b981', label: 'Improving' },
    STABLE: { icon: '→', color: '#6b7280', label: 'Stable' },
    DECLINING: { icon: '↓', color: '#ef4444', label: 'Declining' },
  };

  const config = trendConfig[trend];
  const delta =
    previousScore !== undefined && currentScore !== undefined
      ? currentScore - previousScore
      : null;

  return (
    <span className="credibility-trend" style={{ color: config.color }}>
      <span className="trend-icon">{config.icon}</span>
      <span className="trend-label">{config.label}</span>
      {delta !== null && (
        <span className="trend-delta">
          ({delta > 0 ? '+' : ''}
          {delta})
        </span>
      )}
    </span>
  );
};
