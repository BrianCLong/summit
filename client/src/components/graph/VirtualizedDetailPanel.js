"use strict";
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
exports.VirtualizedDetailPanel = VirtualizedDetailPanel;
const react_1 = __importStar(require("react"));
const react_window_1 = require("react-window");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const ITEM_HEIGHT = 72;
function EntityItem({ index, style, data, }) {
    const entity = data.entities[index];
    return (<div style={style}>
      <material_1.ListItem sx={{ px: 2, py: 1 }} secondaryAction={<material_1.Box>
            <material_1.IconButton size="small" onClick={(e) => {
                e.stopPropagation();
                data.onAction(entity, 'open');
            }}>
              <icons_material_1.OpenInNew fontSize="small"/>
            </material_1.IconButton>
            <material_1.IconButton size="small" onClick={(e) => {
                e.stopPropagation();
                data.onAction(entity, 'menu');
            }}>
              <icons_material_1.MoreVert fontSize="small"/>
            </material_1.IconButton>
          </material_1.Box>}>
        <material_1.ListItemButton onClick={() => data.onSelect(entity)} sx={{ px: 0 }}>
          <material_1.ListItemText primary={<material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <material_1.Typography variant="subtitle2" noWrap>
                  {entity.label}
                </material_1.Typography>
                <material_1.Chip size="small" label={entity.type} color="primary" variant="outlined" sx={{ fontSize: '0.7rem', height: 18 }}/>
                {entity.score && (<material_1.Chip size="small" label={`${Math.round(entity.score * 100)}%`} color="secondary" sx={{ fontSize: '0.7rem', height: 18 }}/>)}
              </material_1.Box>} secondary={<material_1.Typography variant="caption" color="text.secondary" noWrap>
                {Object.entries(entity.properties)
                .slice(0, 2)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' • ')}
              </material_1.Typography>}/>
        </material_1.ListItemButton>
      </material_1.ListItem>

      {index < data.entities.length - 1 && <material_1.Divider />}
    </div>);
}
function VirtualizedDetailPanel({ entities, height, onEntitySelect, onEntityAction, }) {
    const itemData = (0, react_1.useMemo)(() => ({
        entities,
        onSelect: onEntitySelect,
        onAction: onEntityAction,
    }), [entities, onEntitySelect, onEntityAction]);
    return (<material_1.Paper elevation={1} sx={{ height, display: 'flex', flexDirection: 'column' }}>
      <material_1.Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <material_1.Typography variant="h6">
          Entity Details
          <material_1.Chip size="small" label={entities.length} sx={{ ml: 1 }}/>
        </material_1.Typography>
      </material_1.Box>

      {entities.length === 0 ? (<material_1.Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          <material_1.Typography variant="body2">
            Select entities to view details
          </material_1.Typography>
        </material_1.Box>) : (<react_window_1.FixedSizeList height={height - 64} // Account for header
         itemCount={entities.length} itemSize={ITEM_HEIGHT} itemData={itemData} overscanCount={5} // Pre-render 5 items above/below viewport
        >
          {EntityItem}
        </react_window_1.FixedSizeList>)}

      {entities.length > 100 && (<material_1.Box sx={{ p: 1, bgcolor: 'grey.50', textAlign: 'center' }}>
          <material_1.Typography variant="caption" color="text.secondary">
            Virtualized • {entities.length} entities
          </material_1.Typography>
        </material_1.Box>)}
    </material_1.Paper>);
}
