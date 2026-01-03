import React, { useMemo } from 'react';
import type { RiskScore, RiskLevel, RiskCategory } from './types';

export interface RiskScoreGaugeProps {
  riskScore: RiskScore;
  size?: 'small' | 'medium' | 'large';
  showBreakdown?: boolean;
  showTrend?: boolean;
  onCategoryClick?: (category: RiskCategory) => void;
  className?: string;
}

const riskLevelColors: Record<RiskLevel, string> = {
  minimal: '#22C55E',
  low: '#84CC16',
  medium: '#EAB308',
  high: '#F97316',
  critical: '#EF4444',
};

const riskLevelBgColors: Record<RiskLevel, string> = {
  minimal: 'bg-green-100 text-green-800',
  low: 'bg-lime-100 text-lime-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const trendIcons: Record<string, string> = {
  improving: '\u2193',
  stable: '\u2192',
  worsening: '\u2191',
};

const trendColors: Record<string, string> = {
  improving: 'text-green-600',
  stable: 'text-gray-600',
  worsening: 'text-red-600',
};

const sizeConfig = {
  small: { width: 120, height: 80, strokeWidth: 8, fontSize: 24 },
  medium: { width: 180, height: 120, strokeWidth: 12, fontSize: 36 },
  large: { width: 240, height: 160, strokeWidth: 16, fontSize: 48 },
};

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({
  riskScore,
  size = 'medium',
  showBreakdown = true,
  showTrend = true,
  onCategoryClick,
  className = '',
}) => {
  const config = sizeConfig[size];

  const gaugeData = useMemo(() => {
    const centerX = config.width / 2;
    const centerY = config.height - 10;
    const radius = config.height - 20;

    // Create arc path
    const startAngle = Math.PI;
    const endAngle = 0;
    const scoreAngle = startAngle - (riskScore.overall / 100) * Math.PI;

    const describeArc = (
      x: number,
      y: number,
      r: number,
      startAng: number,
      endAng: number
    ): string => {
      const start = {
        x: x + r * Math.cos(startAng),
        y: y - r * Math.sin(startAng),
      };
      const end = {
        x: x + r * Math.cos(endAng),
        y: y - r * Math.sin(endAng),
      };
      const largeArcFlag = startAng - endAng <= Math.PI ? '0' : '1';

      return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    };

    return {
      centerX,
      centerY,
      radius,
      backgroundPath: describeArc(centerX, centerY, radius, startAngle, endAngle),
      scorePath: describeArc(centerX, centerY, radius, startAngle, scoreAngle),
      color: riskLevelColors[riskScore.level],
    };
  }, [riskScore, config]);

  const scoreDelta = useMemo(() => {
    if (riskScore.previousScore === undefined) return null;
    return riskScore.overall - riskScore.previousScore;
  }, [riskScore]);

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
      data-testid="risk-score-gauge"
    >
      {/* Gauge */}
      <div className="flex flex-col items-center">
        <svg width={config.width} height={config.height} className="overflow-visible">
          {/* Background arc */}
          <path
            d={gaugeData.backgroundPath}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <path
            d={gaugeData.scorePath}
            fill="none"
            stroke={gaugeData.color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
          {/* Score text */}
          <text
            x={gaugeData.centerX}
            y={gaugeData.centerY - 20}
            textAnchor="middle"
            fontSize={config.fontSize}
            fontWeight="bold"
            fill="#1F2937"
          >
            {riskScore.overall}
          </text>
          {/* Risk level label */}
          <text
            x={gaugeData.centerX}
            y={gaugeData.centerY + 5}
            textAnchor="middle"
            fontSize={12}
            fill={gaugeData.color}
            fontWeight="medium"
          >
            {riskScore.level.toUpperCase()}
          </text>
        </svg>

        {/* Trend and Delta */}
        {showTrend && (
          <div className="flex items-center gap-4 mt-2">
            <div className={`flex items-center gap-1 ${trendColors[riskScore.trend]}`}>
              <span className="text-lg">{trendIcons[riskScore.trend]}</span>
              <span className="text-sm font-medium capitalize">{riskScore.trend}</span>
            </div>
            {scoreDelta !== null && (
              <div
                className={`text-sm ${
                  scoreDelta > 0 ? 'text-red-600' : scoreDelta < 0 ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {scoreDelta > 0 ? '+' : ''}{scoreDelta} vs previous
              </div>
            )}
          </div>
        )}
      </div>

      {/* Risk Level Scale */}
      <div className="mt-4 flex justify-between px-2">
        {(['minimal', 'low', 'medium', 'high', 'critical'] as RiskLevel[]).map((level) => (
          <div
            key={level}
            className={`text-xs px-2 py-0.5 rounded ${
              riskScore.level === level
                ? riskLevelBgColors[level]
                : 'text-gray-400'
            }`}
          >
            {level.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      {/* Breakdown */}
      {showBreakdown && riskScore.breakdown.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Risk Breakdown</h3>
          {riskScore.breakdown.map((category) => (
            <div
              key={category.name}
              className={`p-3 bg-gray-50 rounded-lg ${
                onCategoryClick ? 'cursor-pointer hover:bg-gray-100' : ''
              }`}
              onClick={() => onCategoryClick?.(category)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{category.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Weight: {category.weight}%</span>
                  <span
                    className={`text-sm font-medium ${
                      category.score >= 70
                        ? 'text-red-600'
                        : category.score >= 40
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}
                  >
                    {category.score}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    category.score >= 70
                      ? 'bg-red-500'
                      : category.score >= 40
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${category.score}%` }}
                />
              </div>

              {/* Factors */}
              {category.factors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {category.factors.map((factor) => (
                    <div
                      key={factor.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            factor.impact === 'positive'
                              ? 'bg-green-500'
                              : factor.impact === 'negative'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                          }`}
                        />
                        <span className="text-gray-600">{factor.name}</span>
                      </div>
                      <span
                        className={`${
                          factor.impact === 'positive'
                            ? 'text-green-600'
                            : factor.impact === 'negative'
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {factor.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Calculated timestamp */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Last calculated: {new Date(riskScore.calculatedAt).toLocaleString()}
      </div>
    </div>
  );
};

export default RiskScoreGauge;
