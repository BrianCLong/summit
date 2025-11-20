import React, { Suspense } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Toolbar from './Toolbar';
import SidePanel from './SidePanel';

const GraphCanvas = React.lazy(() => import('./GraphCanvas'));

export default function GraphWorkbench() {
  return (
    <Box p={1}>
      <Toolbar />
      <Grid container spacing={1}>
        <Grid item xs={12} md={9}>
          <Suspense
            fallback={
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height={600}
                bgcolor="#f5f5f5"
                borderRadius={2}
              >
                <CircularProgress />
              </Box>
            }
          >
            <GraphCanvas />
          </Suspense>
        </Grid>
        <Grid item xs={12} md={3}>
          <SidePanel />
        </Grid>
      </Grid>
    </Box>
  );
}
