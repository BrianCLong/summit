import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
} from '@mui/material';
import {
  MoreVert,
  Label,
  Folder,
  Delete,
  Archive,
  Share,
  GetApp,
} from '@mui/icons-material';

interface BulkActionsProps {
  selectedItems: string[];
  onSelectionClear: () => void;
  onActionComplete: () => void;
}

type BulkActionId =
  | 'tag'
  | 'move'
  | 'share'
  | 'export'
  | 'archive'
  | 'delete';

type BulkActionConfig = {
  id: BulkActionId;
  label: string;
  icon: typeof Label;
  color: 'primary' | 'info' | 'secondary' | 'success' | 'warning' | 'error';
};

const BULK_ACTIONS: BulkActionConfig[] = [
  { id: 'tag', label: 'Add Tags', icon: Label, color: 'primary' },
  {
    id: 'move',
    label: 'Move to Investigation',
    icon: Folder,
    color: 'info',
  },
  {
    id: 'share',
    label: 'Share Selection',
    icon: Share,
    color: 'secondary',
  },
  {
    id: 'export',
    label: 'Export Selection',
    icon: GetApp,
    color: 'success',
  },
  {
    id: 'archive',
    label: 'Archive Items',
    icon: Archive,
    color: 'warning',
  },
  {
    id: 'delete',
    label: 'Delete Items',
    icon: Delete,
    color: 'error',
  },
];

export function BulkActions({
  selectedItems,
  onSelectionClear,
  onActionComplete,
}: BulkActionsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogAction, setDialogAction] = useState<BulkActionId | null>(null);
  const [actionMetadata, setActionMetadata] = useState<Record<string, string>>(
    {},
  );

  const [bulkAction, { loading }] = useBulkActionMutation();

  const handleActionClick = (actionId: BulkActionId) => {
    setDialogAction(actionId);
    setAnchorEl(null);
    setActionMetadata({});
  };

  const executeBulkAction = async () => {
    if (!dialogAction) return;

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
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  if (selectedItems.length === 0) return null;

  return (
    <>
      <Box
        sx={{
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
        }}
      >
        <Chip
          label={`${selectedItems.length} selected`}
          color="primary"
          variant="outlined"
        />

        <Button
          variant="outlined"
          endIcon={<MoreVert />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          disabled={loading}
        >
          Bulk Actions
        </Button>

        <Button variant="text" onClick={onSelectionClear} sx={{ ml: 'auto' }}>
          Clear Selection
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          {BULK_ACTIONS.map((action) => (
            <MenuItem
              key={action.id}
              onClick={() => handleActionClick(action.id)}
            >
              <ListItemIcon>
                <action.icon color={action.color} />
              </ListItemIcon>
              <ListItemText>{action.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* Action configuration dialog */}
      <Dialog
        open={Boolean(dialogAction)}
        onClose={() => setDialogAction(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {BULK_ACTIONS.find((a) => a.id === dialogAction)?.label}
        </DialogTitle>

        <DialogContent>
          {dialogAction === 'tag' && (
            <TextField
              autoFocus
              margin="dense"
              label="Tags (comma-separated)"
              fullWidth
              variant="outlined"
              value={actionMetadata.tags || ''}
              onChange={(e) =>
                setActionMetadata({ ...actionMetadata, tags: e.target.value })
              }
              placeholder="urgent, review-needed, evidence"
            />
          )}

          {dialogAction === 'move' && (
            <FormControl fullWidth margin="dense">
              <InputLabel>Target Investigation</InputLabel>
              <Select
                value={actionMetadata.investigationId || ''}
                onChange={(e) =>
                  setActionMetadata({
                    ...actionMetadata,
                    investigationId: e.target.value,
                  })
                }
              >
                <MenuItem value="inv-001">Operation Nexus</MenuItem>
                <MenuItem value="inv-002">Project Blackout</MenuItem>
                <MenuItem value="inv-003">Task Force Alpha</MenuItem>
              </Select>
            </FormControl>
          )}

          {dialogAction === 'export' && (
            <FormControl fullWidth margin="dense">
              <InputLabel>Export Format</InputLabel>
              <Select
                value={actionMetadata.format || 'pdf'}
                onChange={(e) =>
                  setActionMetadata({
                    ...actionMetadata,
                    format: e.target.value,
                  })
                }
              >
                <MenuItem value="pdf">PDF Report</MenuItem>
                <MenuItem value="csv">CSV Data</MenuItem>
                <MenuItem value="json">JSON Export</MenuItem>
                <MenuItem value="xlsx">Excel Workbook</MenuItem>
              </Select>
            </FormControl>
          )}

          {(dialogAction === 'delete' || dialogAction === 'archive') && (
            <TextField
              margin="dense"
              label="Reason (optional)"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={actionMetadata.reason || ''}
              onChange={(e) =>
                setActionMetadata({ ...actionMetadata, reason: e.target.value })
              }
              placeholder="Explain why these items are being archived/deleted..."
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogAction(null)}>Cancel</Button>
          <Button
            onClick={executeBulkAction}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {loading ? 'Processing...' : 'Execute'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

type BulkActionVariables = {
  action: BulkActionId;
  targetIds: string[];
  metadata: Record<string, string>;
};

type BulkActionMutation = (options: {
  variables: BulkActionVariables;
}) => Promise<void>;

function useBulkActionMutation(): [
  BulkActionMutation,
  { loading: boolean },
] {
  const [loading, setLoading] = useState(false);

  const mutate = useCallback<BulkActionMutation>(async ({ variables }) => {
    setLoading(true);
    try {
      // Simulate async persistence while UI wiring is finalized.
      await new Promise((resolve) => setTimeout(resolve, 250));
      console.log('Bulk action executed', variables);
    } finally {
      setLoading(false);
    }
  }, []);

  return [mutate, { loading }];
}
