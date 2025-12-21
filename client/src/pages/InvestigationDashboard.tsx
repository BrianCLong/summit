import React from 'react';
import { Paper, Typography } from '@mui/material';
import { Responsive, WidthProvider, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const InvestigationMetadataTile: React.FC = () => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="h6" gutterBottom>
      Investigation Metadata
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Configure investigation details here.
    </Typography>
  </Paper>
);

const EntityActivityTile: React.FC = () => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="h6" gutterBottom>
      Entity Activity Over Time
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Timeline visualisation placeholder.
    </Typography>
  </Paper>
);

const EntitiesTile: React.FC = () => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="h6" gutterBottom>
      Entities
    </Typography>
    <Typography variant="body2" color="text.secondary">
      List of key entities.
    </Typography>
  </Paper>
);

const RelationshipDensityHeatmapTile: React.FC = () => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="h6" gutterBottom>
      Relationship Density Heatmap
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Heatmap visualisation placeholder.
    </Typography>
  </Paper>
);

const defaultLayouts: Layouts = {
  lg: [
    { i: 'metadata', x: 0, y: 0, w: 3, h: 2 },
    { i: 'timeline', x: 3, y: 0, w: 3, h: 2 },
    { i: 'entities', x: 0, y: 2, w: 3, h: 2 },
    { i: 'heatmap', x: 3, y: 2, w: 3, h: 2 },
  ],
};

const InvestigationDashboard: React.FC = () => {
  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={defaultLayouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 6, md: 6, sm: 6, xs: 2, xxs: 1 }}
      rowHeight={150}
      isDraggable
      isResizable
    >
      <div key="metadata">
        <InvestigationMetadataTile />
      </div>
      <div key="timeline">
        <EntityActivityTile />
      </div>
      <div key="entities">
        <EntitiesTile />
      </div>
      <div key="heatmap">
        <RelationshipDensityHeatmapTile />
      </div>
    </ResponsiveGridLayout>
  );
};

export default InvestigationDashboard;
