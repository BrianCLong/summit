"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Toolbar;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function Toolbar() {
    return (<material_1.Stack direction="row" spacing={1} sx={{ mb: 1 }}>
      <material_1.Tooltip title="Zoom to fit">
        <material_1.Button size="small" variant="outlined">
          Fit
        </material_1.Button>
      </material_1.Tooltip>
      <material_1.Tooltip title="Force-directed layout">
        <material_1.Button size="small" variant="outlined">
          Force
        </material_1.Button>
      </material_1.Tooltip>
      <material_1.Tooltip title="Concentric by centrality">
        <material_1.Button size="small" variant="outlined">
          Concentric
        </material_1.Button>
      </material_1.Tooltip>
      <material_1.Tooltip title="Grid layout (debug)">
        <material_1.Button size="small" variant="outlined">
          Grid
        </material_1.Button>
      </material_1.Tooltip>
    </material_1.Stack>);
}
