import React from 'react';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import Toolbar from './Toolbar.tsx';
import GraphCanvas from './GraphCanvas.tsx';
import SidePanel from './SidePanel.tsx';

export default function GraphWorkbench() {
  return (
    <Box p={1}>
      <Toolbar />
      <Grid container spacing={1}>
        <Grid size={{ xs: 12, md: 9 }}>
          <GraphCanvas />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <SidePanel />
        </Grid>
      </Grid>
    </Box>
  );
}
