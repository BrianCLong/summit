"use strict";
/**
 * Credibility Badge Component
 *
 * Displays source credibility rating using Admiralty/NATO system.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredibilityTrend = exports.CredibilityInline = exports.CredibilityBadge = void 0;
const react_1 = __importDefault(require("react"));
const constants_js_1 = require("../constants.js");
const getRatingColor = (rating) => {
    const colors = {
        A: '#10b981', // Green - Completely reliable
        B: '#22c55e', // Light green - Usually reliable
        C: '#f59e0b', // Amber - Fairly reliable
        D: '#f97316', // Orange - Not usually reliable
        E: '#ef4444', // Red - Unreliable
        F: '#6b7280', // Gray - Cannot be judged
    };
    return colors[rating];
};
const getScoreColor = (score) => {
    if (score >= 80)
        return '#10b981';
    if (score >= 60)
        return '#22c55e';
    if (score >= 40)
        return '#f59e0b';
    if (score >= 20)
        return '#f97316';
    return '#ef4444';
};
const CredibilityBadge = ({ sourceRating, infoRating, score, size = 'medium', showLabel = true, showScore = false, }) => {
    const ratingInfo = constants_js_1.CREDIBILITY_RATINGS[sourceRating];
    const infoRatingInfo = infoRating ? constants_js_1.INFORMATION_RATINGS[infoRating] : null;
    const sizeClasses = {
        small: 'badge-small',
        medium: 'badge-medium',
        large: 'badge-large',
    };
    return (<div className={`credibility-badge ${sizeClasses[size]}`}>
      {/* Source Rating */}
      <div className="rating-circle source-rating" style={{ backgroundColor: getRatingColor(sourceRating) }} title={ratingInfo.label}>
        {sourceRating}
      </div>

      {/* Information Rating (if provided) */}
      {infoRating && infoRatingInfo && (<div className="rating-circle info-rating" style={{
                backgroundColor: getScoreColor(infoRatingInfo.score),
            }} title={infoRatingInfo.label}>
          {infoRating}
        </div>)}

      {/* Combined display for Admiralty format */}
      {infoRating && (<span className="rating-combined">
          {sourceRating}
          {infoRating}
        </span>)}

      {/* Labels */}
      {showLabel && (<div className="rating-labels">
          <span className="source-label">{ratingInfo.label}</span>
          {infoRatingInfo && (<span className="info-label">{infoRatingInfo.label}</span>)}
        </div>)}

      {/* Score bar */}
      {showScore && score !== undefined && (<div className="score-display">
          <div className="score-bar">
            <div className="score-fill" style={{
                width: `${score}%`,
                backgroundColor: getScoreColor(score),
            }}/>
          </div>
          <span className="score-value">{score}</span>
        </div>)}
    </div>);
};
exports.CredibilityBadge = CredibilityBadge;
const CredibilityInline = ({ sourceRating, infoRating, }) => {
    return (<span className="credibility-inline" style={{ color: getRatingColor(sourceRating) }} title={`${constants_js_1.CREDIBILITY_RATINGS[sourceRating].label}${infoRating ? ` / ${constants_js_1.INFORMATION_RATINGS[infoRating].label}` : ''}`}>
      {sourceRating}
      {infoRating || ''}
    </span>);
};
exports.CredibilityInline = CredibilityInline;
const CredibilityTrend = ({ trend, previousScore, currentScore, }) => {
    const trendConfig = {
        IMPROVING: { icon: '↑', color: '#10b981', label: 'Improving' },
        STABLE: { icon: '→', color: '#6b7280', label: 'Stable' },
        DECLINING: { icon: '↓', color: '#ef4444', label: 'Declining' },
    };
    const config = trendConfig[trend];
    const delta = previousScore !== undefined && currentScore !== undefined
        ? currentScore - previousScore
        : null;
    return (<span className="credibility-trend" style={{ color: config.color }}>
      <span className="trend-icon">{config.icon}</span>
      <span className="trend-label">{config.label}</span>
      {delta !== null && (<span className="trend-delta">
          ({delta > 0 ? '+' : ''}
          {delta})
        </span>)}
    </span>);
};
exports.CredibilityTrend = CredibilityTrend;
