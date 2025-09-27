import React, { useState } from 'react';
import { Box, Switch, Typography, Slider } from '@mui/material';
import { useMutation } from '@apollo/client';
import { SET_ANOMALY_ALERT_CONFIG } from '../../graphql/notification.gql.js';

export default function AnomalySettings({ investigationId }) {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(0.85);
  const [saveConfig] = useMutation(SET_ANOMALY_ALERT_CONFIG);

  const persist = async (config) => {
    try {
      await saveConfig({ variables: { investigationId, ...config } });
    } catch (err) {
      console.error('Failed to save anomaly config', err);
    }
  };

  const handleToggle = async (event) => {
    const value = event.target.checked;
    setEnabled(value);
    await persist({ enabled: value, threshold });
  };

  const handleThreshold = async (_e, value) => {
    setThreshold(value);
    await persist({ enabled, threshold: value });
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>Anomaly Alerts</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Switch checked={enabled} onChange={handleToggle} />
        <Typography>{enabled ? 'Enabled' : 'Disabled'}</Typography>
      </Box>
      {enabled && (
        <Box sx={{ width: 300 }}>
          <Typography gutterBottom>Threshold: {threshold.toFixed(2)}</Typography>
          <Slider min={0} max={1} step={0.01} value={threshold} onChangeCommitted={handleThreshold} />
        </Box>
      )}
    </Box>
  );
}

