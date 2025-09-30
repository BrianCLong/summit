import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Menu,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import { useMutation } from '@apollo/client';
import { EXPAND_NEIGHBORS, TAG_ENTITY } from '../../graphql/graph.gql';
import { graphInteractionActions as g } from '../../store/slices/graphInteractionSlice';
import { getSocket } from '../../realtime/socket';

export default function GraphContextMenu() {
  const dispatch = useDispatch();
  const { contextMenu } = useSelector((s) => s.graphInteraction);
  const [anchorPos, setAnchorPos] = useState(null);
  const [tagOpen, setTagOpen] = useState(false);
  const [tag, setTag] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const [expand] = useMutation(EXPAND_NEIGHBORS);
  const [tagEntity] = useMutation(TAG_ENTITY);
  const socket = getSocket();

  useEffect(() => {
    if (contextMenu?.open) {
      setAnchorPos({ mouseX: contextMenu.y + 2, mouseY: contextMenu.x + 2 });
    } else setAnchorPos(null);
  }, [contextMenu]);

  const closeMenu = () => dispatch(g.contextMenuClose());

  const onExpand = async () => {
    closeMenu();
    if (!contextMenu?.targetId) return;
    try {
      const { data } = await expand({ variables: { entityId: contextMenu.targetId, limit: 50 } });
      const payload = data?.expandNeighbors;
      if (payload?.nodes || payload?.edges) {
        const event = new CustomEvent('graph:addElements', {
          detail: { nodes: payload.nodes || [], edges: payload.edges || [] },
        });
        document.dispatchEvent(event);
        const n = (payload.nodes || []).length;
        const e = (payload.edges || []).length;
        setSnackbar({
          open: true,
          message: `Neighbors expanded: +${n} nodes, +${e} edges`,
          severity: 'success',
        });
      }
    } catch (e) {
      setSnackbar({ open: true, message: `Expand failed: ${e.message || e}`, severity: 'error' });
    }
  };

  const onTag = () => setTagOpen(true);
  const onSaveTag = async () => {
    try {
      await tagEntity({ variables: { entityId: contextMenu.targetId, tag } });
      setTag('');
      setTagOpen(false);
      closeMenu();
      setSnackbar({ open: true, message: `Tag '${tag}' added`, severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: `Tag failed: ${e.message || e}`, severity: 'error' });
    }
  };

  const onSendToAI = async () => {
    closeMenu();
    if (!contextMenu?.targetId) return;
    try {
      socket.emit('ai:request', { entityId: contextMenu.targetId });
      setSnackbar({ open: true, message: 'AI analysis requested', severity: 'success' });
    } catch (e) {
      setSnackbar({
        open: true,
        message: `AI request failed: ${e.message || e}`,
        severity: 'error',
      });
    }
  };

  const onExploreSubgraph = () => {
    closeMenu();
    document.dispatchEvent(new CustomEvent('graph:exploreSubgraph'));
  };

  return (
    <>
      <Menu
        open={!!anchorPos}
        onClose={closeMenu}
        anchorReference="anchorPosition"
        anchorPosition={anchorPos ? { top: anchorPos.mouseX, left: anchorPos.mouseY } : undefined}
      >
        <MenuItem onClick={onExpand}>Expand Neighbors</MenuItem>
        <MenuItem onClick={onTag}>Tag Entity</MenuItem>
        <MenuItem onClick={onExploreSubgraph}>Explore Subgraph</MenuItem>
        <MenuItem onClick={onSendToAI}>Send to AI Analysis</MenuItem>
        {contextMenu?.targetType === 'edge' && (
          <MenuItem
            onClick={() => {
              closeMenu();
              document.dispatchEvent(
                new CustomEvent('graph:openEdgeInspector', {
                  detail: { edgeId: contextMenu.targetId },
                }),
              );
            }}
          >
            Inspect Relationship
          </MenuItem>
        )}
      </Menu>

      <Dialog open={tagOpen} onClose={() => setTagOpen(false)}>
        <DialogTitle>Tag Entity</DialogTitle>
        <DialogContent>
          <TextField
            label="Tag"
            fullWidth
            autoFocus
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSaveTag} disabled={!tag.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  <Snackbar
    open={snackbar.open}
    autoHideDuration={4000}
    onClose={() => setSnackbar({ ...snackbar, open: false })}
  >
    <Alert
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      severity={snackbar.severity}
      sx={{ width: '100%' }}
    >
      {snackbar.message}
    </Alert>
  </Snackbar>;
}
