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
exports.BulkActions = BulkActions;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const BULK_ACTIONS = [
    { id: 'tag', label: 'Add Tags', icon: icons_material_1.Label, color: 'primary' },
    {
        id: 'move',
        label: 'Move to Investigation',
        icon: icons_material_1.Folder,
        color: 'info',
    },
    {
        id: 'share',
        label: 'Share Selection',
        icon: icons_material_1.Share,
        color: 'secondary',
    },
    {
        id: 'export',
        label: 'Export Selection',
        icon: icons_material_1.GetApp,
        color: 'success',
    },
    {
        id: 'archive',
        label: 'Archive Items',
        icon: icons_material_1.Archive,
        color: 'warning',
    },
    {
        id: 'delete',
        label: 'Delete Items',
        icon: icons_material_1.Delete,
        color: 'error',
    },
];
function BulkActions({ selectedItems, onSelectionClear, onActionComplete, }) {
    const [anchorEl, setAnchorEl] = (0, react_1.useState)(null);
    const [dialogAction, setDialogAction] = (0, react_1.useState)(null);
    const [actionMetadata, setActionMetadata] = (0, react_1.useState)({});
    const [bulkAction, { loading }] = useBulkActionMutation();
    const handleActionClick = (actionId) => {
        setDialogAction(actionId);
        setAnchorEl(null);
        setActionMetadata({});
    };
    const executeBulkAction = async () => {
        if (!dialogAction)
            return;
        try {
            await bulkAction({
                variables: {
                    action: dialogAction,
                    targetIds: selectedItems,
                    metadata: actionMetadata,
                },
            });
            setDialogAction(null);
            onActionComplete();
            onSelectionClear();
        }
        catch (error) {
            console.error('Bulk action failed:', error);
        }
    };
    if (selectedItems.length === 0)
        return null;
    return (<>
      <material_1.Box sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'background.paper',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
        }}>
        <material_1.Chip label={`${selectedItems.length} selected`} color="primary" variant="outlined"/>

        <material_1.Button variant="outlined" endIcon={<icons_material_1.MoreVert />} onClick={(e) => setAnchorEl(e.currentTarget)} disabled={loading}>
          Bulk Actions
        </material_1.Button>

        <material_1.Button variant="text" onClick={onSelectionClear} sx={{ ml: 'auto' }}>
          Clear Selection
        </material_1.Button>

        <material_1.Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          {BULK_ACTIONS.map((action) => (<material_1.MenuItem key={action.id} onClick={() => handleActionClick(action.id)}>
              <material_1.ListItemIcon>
                <action.icon color={action.color}/>
              </material_1.ListItemIcon>
              <material_1.ListItemText>{action.label}</material_1.ListItemText>
            </material_1.MenuItem>))}
        </material_1.Menu>
      </material_1.Box>

      {/* Action configuration dialog */}
      <material_1.Dialog open={Boolean(dialogAction)} onClose={() => setDialogAction(null)} maxWidth="sm" fullWidth>
        <material_1.DialogTitle>
          {BULK_ACTIONS.find((a) => a.id === dialogAction)?.label}
        </material_1.DialogTitle>

        <material_1.DialogContent>
          {dialogAction === 'tag' && (<material_1.TextField autoFocus margin="dense" label="Tags (comma-separated)" fullWidth variant="outlined" value={actionMetadata.tags || ''} onChange={(e) => setActionMetadata({ ...actionMetadata, tags: e.target.value })} placeholder="urgent, review-needed, evidence"/>)}

          {dialogAction === 'move' && (<material_1.FormControl fullWidth margin="dense">
              <material_1.InputLabel>Target Investigation</material_1.InputLabel>
              <material_1.Select value={actionMetadata.investigationId || ''} onChange={(e) => setActionMetadata({
                ...actionMetadata,
                investigationId: e.target.value,
            })}>
                <material_1.MenuItem value="inv-001">Operation Nexus</material_1.MenuItem>
                <material_1.MenuItem value="inv-002">Project Blackout</material_1.MenuItem>
                <material_1.MenuItem value="inv-003">Task Force Alpha</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>)}

          {dialogAction === 'export' && (<material_1.FormControl fullWidth margin="dense">
              <material_1.InputLabel>Export Format</material_1.InputLabel>
              <material_1.Select value={actionMetadata.format || 'pdf'} onChange={(e) => setActionMetadata({
                ...actionMetadata,
                format: e.target.value,
            })}>
                <material_1.MenuItem value="pdf">PDF Report</material_1.MenuItem>
                <material_1.MenuItem value="csv">CSV Data</material_1.MenuItem>
                <material_1.MenuItem value="json">JSON Export</material_1.MenuItem>
                <material_1.MenuItem value="xlsx">Excel Workbook</material_1.MenuItem>
              </material_1.Select>
            </material_1.FormControl>)}

          {(dialogAction === 'delete' || dialogAction === 'archive') && (<material_1.TextField margin="dense" label="Reason (optional)" fullWidth multiline rows={3} variant="outlined" value={actionMetadata.reason || ''} onChange={(e) => setActionMetadata({ ...actionMetadata, reason: e.target.value })} placeholder="Explain why these items are being archived/deleted..."/>)}
        </material_1.DialogContent>

        <material_1.DialogActions>
          <material_1.Button onClick={() => setDialogAction(null)}>Cancel</material_1.Button>
          <material_1.Button onClick={executeBulkAction} variant="contained" disabled={loading} startIcon={loading ? <material_1.CircularProgress size={16}/> : undefined}>
            {loading ? 'Processing...' : 'Execute'}
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </>);
}
function useBulkActionMutation() {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const mutate = (0, react_1.useCallback)(async ({ variables }) => {
        setLoading(true);
        try {
            // Simulate async persistence while UI wiring is finalized.
            await new Promise((resolve) => setTimeout(resolve, 250));
            console.log('Bulk action executed', variables);
        }
        finally {
            setLoading(false);
        }
    }, []);
    return [mutate, { loading }];
}
