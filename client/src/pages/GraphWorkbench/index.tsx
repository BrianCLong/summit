import React from "react";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Toolbar from "./Toolbar";
import GraphCanvas from "./GraphCanvas";
import SidePanel from "./SidePanel";

export default function GraphWorkbench() {
  return (
    <Box p={1}>
      <Toolbar />
      <Grid container spacing={1}>
        <Grid item xs={12} md={9}>
          <GraphCanvas />
        </Grid>
        <Grid item xs={12} md={3}>
          <SidePanel />
        </Grid>
      </Grid>
    </Box>
  );
}
