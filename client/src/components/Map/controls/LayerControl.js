"use strict";
/**
 * Layer Control Component for managing map layers
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayerControl = void 0;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
/**
 * Layer control panel for managing map layers
 */
const LayerControl = ({ layers, onLayerToggle, onOpacityChange, position = 'topright', }) => {
    const [open, setOpen] = (0, react_1.useState)(true);
    const [expandedLayers, setExpandedLayers] = (0, react_1.useState)(new Set());
    const positionStyles = {
        topright: { position: 'absolute', top: 10, right: 10, zIndex: 1000 },
        topleft: { position: 'absolute', top: 10, left: 10, zIndex: 1000 },
        bottomright: { position: 'absolute', bottom: 10, right: 10, zIndex: 1000 },
        bottomleft: { position: 'absolute', bottom: 10, left: 10, zIndex: 1000 },
    };
    const toggleLayerExpanded = (layerId) => {
        const newExpanded = new Set(expandedLayers);
        if (newExpanded.has(layerId)) {
            newExpanded.delete(layerId);
        }
        else {
            newExpanded.add(layerId);
        }
        setExpandedLayers(newExpanded);
    };
    return (<material_1.Paper elevation={3} sx={{
            ...positionStyles[position],
            minWidth: 250,
            maxWidth: 350,
        }}>
      <material_1.Box sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e0e0e0',
            cursor: 'pointer',
        }} onClick={() => setOpen(!open)}>
        <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <icons_material_1.Layers fontSize="small"/>
          <material_1.Typography variant="subtitle2">Layers</material_1.Typography>
        </material_1.Box>
        <material_1.IconButton size="small">
          {open ? <icons_material_1.ExpandLess fontSize="small"/> : <icons_material_1.ExpandMore fontSize="small"/>}
        </material_1.IconButton>
      </material_1.Box>

      <material_1.Collapse in={open}>
        <material_1.List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
          {layers.map((layer) => (<material_1.Box key={layer.id}>
              <material_1.ListItem disablePadding secondaryAction={<material_1.Switch edge="end" checked={layer.visible} onChange={(e) => onLayerToggle(layer.id, e.target.checked)} size="small"/>}>
                <material_1.ListItemButton onClick={() => toggleLayerExpanded(layer.id)} dense>
                  <material_1.ListItemIcon sx={{ minWidth: 36 }}>
                    {layer.visible ? (<icons_material_1.Visibility fontSize="small"/>) : (<icons_material_1.VisibilityOff fontSize="small"/>)}
                  </material_1.ListItemIcon>
                  <material_1.ListItemText primary={layer.name} secondary={layer.type} primaryTypographyProps={{ variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption' }}/>
                  {expandedLayers.has(layer.id) ? (<icons_material_1.ExpandLess fontSize="small"/>) : (<icons_material_1.ExpandMore fontSize="small"/>)}
                </material_1.ListItemButton>
              </material_1.ListItem>

              <material_1.Collapse in={expandedLayers.has(layer.id)}>
                <material_1.Box sx={{ px: 2, py: 1 }}>
                  <material_1.Typography variant="caption" color="text.secondary">
                    Opacity
                  </material_1.Typography>
                  <material_1.Slider value={layer.opacity} onChange={(_, value) => onOpacityChange(layer.id, value)} min={0} max={1} step={0.1} valueLabelDisplay="auto" valueLabelFormat={(value) => `${Math.round(value * 100)}%`} size="small"/>
                </material_1.Box>
              </material_1.Collapse>
            </material_1.Box>))}
        </material_1.List>
      </material_1.Collapse>
    </material_1.Paper>);
};
exports.LayerControl = LayerControl;
