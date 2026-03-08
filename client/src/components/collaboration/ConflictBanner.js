"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictBanner = ConflictBanner;
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
function ConflictBanner({ visible, message = 'This content has been updated by another user. Your changes may conflict.', onRefresh, onDismiss, }) {
    if (!visible)
        return null;
    return (<material_1.Alert severity="warning" icon={<icons_material_1.Warning />} sx={{
            mb: 2,
            borderLeft: 3,
            borderColor: 'warning.main',
            animation: 'slideDown 0.3s ease-out',
            '@keyframes slideDown': {
                from: { opacity: 0, transform: 'translateY(-20px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
            },
        }}>
      <material_1.AlertTitle>Content Conflict Detected</material_1.AlertTitle>
      {message}

      <material_1.Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <material_1.Button size="small" variant="outlined" startIcon={<icons_material_1.Refresh />} onClick={onRefresh}>
          Refresh Content
        </material_1.Button>

        {onDismiss && (<material_1.Button size="small" color="inherit" onClick={onDismiss}>
            Dismiss
          </material_1.Button>)}
      </material_1.Box>
    </material_1.Alert>);
}
