"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SidePanel;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function SidePanel() {
    return (<material_1.Card sx={{ borderRadius: 3 }}>
      <material_1.CardContent>
        <material_1.Typography variant="h6">Details</material_1.Typography>
        <material_1.List dense>
          <material_1.ListItem>
            <material_1.ListItemText primary="Entity" secondary="Select a node"/>
          </material_1.ListItem>
          <material_1.Divider />
          <material_1.ListItem>
            <material_1.ListItemText primary="Actions" secondary="Expand neighbors, Tag, Risk"/>
          </material_1.ListItem>
        </material_1.List>
      </material_1.CardContent>
    </material_1.Card>);
}
