import React from 'react';
import { Stack, Button, Tooltip } from '@mui/material';

export default function Toolbar() {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
      <Tooltip title="Zoom to fit">
        <Button size="small" variant="outlined">Fit</Button>
      </Tooltip>
      <Tooltip title="Force-directed layout">
        <Button size="small" variant="outlined">Force</Button>
      </Tooltip>
      <Tooltip title="Concentric by centrality">
        <Button size="small" variant="outlined">Concentric</Button>
      </Tooltip>
      <Tooltip title="Grid layout (debug)">
        <Button size="small" variant="outlined">Grid</Button>
      </Tooltip>
    </Stack>
  );
}

