/**
 * Summit War Room — Risk Heatmap
 *
 * Risk assessment heatmap showing entity risk scores
 * across dimensions (probability x impact).
 */

import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { useWarRoomStore } from '../store';

const RISK_COLORS = [
  '#10B981', // low
  '#34D399',
  '#FBBF24',
  '#F59E0B',
  '#EF4444', // high
];

const getRiskColor = (score: number): string => {
  const idx = Math.min(Math.floor(score / 20), RISK_COLORS.length - 1);
  return RISK_COLORS[idx];
};

export const RiskHeatmap: React.FC = () => {
  const entities = useWarRoomStore((s) => s.entities);

  // Generate risk scores from entity properties (mock: based on source count + confidence)
  const riskData = useMemo(
    () =>
      entities.slice(0, 100).map((e) => {
        const confidenceScore = { confirmed: 10, probable: 30, possible: 60, doubtful: 90 };
        const risk = confidenceScore[e.confidence] ?? 50;
        return { entity: e, risk };
      }),
    [entities],
  );

  return (
    <Box sx={{ p: 1.5 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Risk Heatmap
      </Typography>

      {riskData.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No entities to assess. Add entities to the graph to generate risk scores.
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
        {riskData.map(({ entity, risk }) => (
          <Tooltip key={entity.id} title={`${entity.label}: risk ${risk}`}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: 0.5,
                bgcolor: getRiskColor(risk),
                cursor: 'pointer',
                transition: 'transform 100ms ease',
                '&:hover': { transform: 'scale(1.3)', zIndex: 1 },
              }}
            />
          </Tooltip>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Low
        </Typography>
        {RISK_COLORS.map((color, idx) => (
          <Box key={idx} sx={{ width: 20, height: 10, bgcolor: color, borderRadius: 0.5 }} />
        ))}
        <Typography variant="caption" color="text.secondary">
          High
        </Typography>
      </Box>
    </Box>
  );
};
