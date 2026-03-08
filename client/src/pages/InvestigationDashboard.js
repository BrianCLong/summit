"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const react_grid_layout_1 = require("react-grid-layout");
require("react-grid-layout/css/styles.css");
require("react-resizable/css/styles.css");
const ResponsiveGridLayout = (0, react_grid_layout_1.WidthProvider)(react_grid_layout_1.Responsive);
const InvestigationMetadataTile = () => (<material_1.Paper sx={{ p: 2, height: '100%' }}>
    <material_1.Typography variant="h6" gutterBottom>
      Investigation Metadata
    </material_1.Typography>
    <material_1.Typography variant="body2" color="text.secondary">
      Configure investigation details here.
    </material_1.Typography>
  </material_1.Paper>);
const EntityActivityTile = () => (<material_1.Paper sx={{ p: 2, height: '100%' }}>
    <material_1.Typography variant="h6" gutterBottom>
      Entity Activity Over Time
    </material_1.Typography>
    <material_1.Typography variant="body2" color="text.secondary">
      Timeline visualisation placeholder.
    </material_1.Typography>
  </material_1.Paper>);
const EntitiesTile = () => (<material_1.Paper sx={{ p: 2, height: '100%' }}>
    <material_1.Typography variant="h6" gutterBottom>
      Entities
    </material_1.Typography>
    <material_1.Typography variant="body2" color="text.secondary">
      List of key entities.
    </material_1.Typography>
  </material_1.Paper>);
const RelationshipDensityHeatmapTile = () => (<material_1.Paper sx={{ p: 2, height: '100%' }}>
    <material_1.Typography variant="h6" gutterBottom>
      Relationship Density Heatmap
    </material_1.Typography>
    <material_1.Typography variant="body2" color="text.secondary">
      Heatmap visualisation placeholder.
    </material_1.Typography>
  </material_1.Paper>);
const defaultLayouts = {
    lg: [
        { i: 'metadata', x: 0, y: 0, w: 3, h: 2 },
        { i: 'timeline', x: 3, y: 0, w: 3, h: 2 },
        { i: 'entities', x: 0, y: 2, w: 3, h: 2 },
        { i: 'heatmap', x: 3, y: 2, w: 3, h: 2 },
    ],
};
const InvestigationDashboard = () => {
    return (<ResponsiveGridLayout className="layout" layouts={defaultLayouts} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 6, md: 6, sm: 6, xs: 2, xxs: 1 }} rowHeight={150} isDraggable isResizable>
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
    </ResponsiveGridLayout>);
};
exports.default = InvestigationDashboard;
