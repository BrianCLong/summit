"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const SavedViewsPanel = ({ views, onSelect }) => (<material_1.Box>
    <material_1.Typography variant="h6" gutterBottom>
      Saved Views
    </material_1.Typography>
    <material_1.List>
      {views.map((v) => (<material_1.ListItem disablePadding key={v.id}>
          <material_1.ListItemButton onClick={() => onSelect?.(v.id)}>
            {v.name}
          </material_1.ListItemButton>
        </material_1.ListItem>))}
    </material_1.List>
    <material_1.Button variant="outlined" size="small">
      Save Current View
    </material_1.Button>
  </material_1.Box>);
exports.default = SavedViewsPanel;
