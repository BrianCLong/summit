import React from 'react';
import Grid from '@mui/material/Unstable_Grid2';
import Box from '@mui/material/Box';
import Toolbar from './Toolbar.js';
import GraphCanvas from './GraphCanvas.js';
import SidePanel from './SidePanel.js';

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
