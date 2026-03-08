"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplainRouteDrawer = ExplainRouteDrawer;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
function ExplainRouteDrawer({ open, onClose, explain, }) {
    return (<material_1.Drawer anchor="right" open={open} onClose={onClose}>
      <div style={{ width: 420, padding: 16 }}>
        <h3>Explain Route</h3>
        <material_1.List>
          {explain?.map((e, i) => (<material_1.ListItem key={i}>
              <material_1.ListItemText primary={e.model} secondary={e.reason}/>
              <material_1.Chip size="small" label={e.reason}/>
            </material_1.ListItem>))}
        </material_1.List>
      </div>
    </material_1.Drawer>);
}
