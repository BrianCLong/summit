import React from 'react';
import { Chip } from '@mui/material';

type Props = { band: 'low' | 'medium' | 'high' };

const colors: Record<Props['band'], 'success' | 'warning' | 'error'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
};

export const ScoreBand: React.FC<Props> = ({ band }) => (
  <Chip label={band} color={colors[band]} size="small" />
);

export default ScoreBand;
