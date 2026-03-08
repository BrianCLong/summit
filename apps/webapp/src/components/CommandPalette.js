"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandPalette = CommandPalette;
const material_1 = require("@mui/material");
const Brightness4_1 = __importDefault(require("@mui/icons-material/Brightness4"));
const Brightness7_1 = __importDefault(require("@mui/icons-material/Brightness7"));
const Clear_1 = __importDefault(require("@mui/icons-material/Clear"));
const DateRange_1 = __importDefault(require("@mui/icons-material/DateRange"));
const react_redux_1 = require("react-redux");
const store_1 = require("../store");
function CommandPalette({ open, onClose, toggleTheme, mode }) {
    const dispatch = (0, react_redux_1.useDispatch)();
    const { selectedNodeId, timeRange } = (0, react_redux_1.useSelector)((state) => state.selection);
    const exec = (fn) => { fn(); onClose(); };
    return (<material_1.Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <material_1.DialogTitle>Command Palette</material_1.DialogTitle>
      <material_1.List>
        <material_1.ListItem disablePadding>
          <material_1.ListItemButton onClick={() => exec(toggleTheme)}>
            <material_1.ListItemIcon>{mode === 'light' ? <Brightness4_1.default /> : <Brightness7_1.default />}</material_1.ListItemIcon>
            <material_1.ListItemText primary={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}/>
          </material_1.ListItemButton>
        </material_1.ListItem>
        {selectedNodeId && (<material_1.ListItem disablePadding>
            <material_1.ListItemButton onClick={() => exec(() => dispatch((0, store_1.selectNode)(null)))}>
              <material_1.ListItemIcon><Clear_1.default /></material_1.ListItemIcon>
              <material_1.ListItemText primary="Clear Node Selection" secondary={`Selected: ${selectedNodeId}`}/>
            </material_1.ListItemButton>
          </material_1.ListItem>)}
        {timeRange && (<material_1.ListItem disablePadding>
            <material_1.ListItemButton onClick={() => exec(() => dispatch((0, store_1.setTimeRange)(null)))}>
              <material_1.ListItemIcon><DateRange_1.default /></material_1.ListItemIcon>
              <material_1.ListItemText primary="Reset Time Range"/>
            </material_1.ListItemButton>
          </material_1.ListItem>)}
      </material_1.List>
    </material_1.Dialog>);
}
