import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Menu, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useMutation } from '@apollo/client';
import { EXPAND_NEIGHBORS, TAG_ENTITY, REQUEST_AI_ANALYSIS } from '../../graphql/graph.gql';
import { graphInteractionActions as g } from '../../store/slices/graphInteractionSlice';

export default function GraphContextMenu() {
  const dispatch = useDispatch();
  const { contextMenu } = useSelector((s) => s.graphInteraction);
  const [anchorPos, setAnchorPos] = useState(null);
  const [tagOpen, setTagOpen] = useState(false);
  const [tag, setTag] = useState('');

  const [expand] = useMutation(EXPAND_NEIGHBORS);
  const [tagEntity] = useMutation(TAG_ENTITY);
  const [requestAI] = useMutation(REQUEST_AI_ANALYSIS);

  useEffect(() => {
    if (contextMenu?.open) {
      setAnchorPos({ mouseX: contextMenu.y + 2, mouseY: contextMenu.x + 2 });
    } else setAnchorPos(null);
  }, [contextMenu]);

  const closeMenu = () => dispatch(g.contextMenuClose());

  const onExpand = async () => {
    closeMenu();
    if (!contextMenu?.targetId) return;
    await expand({ variables: { entityId: contextMenu.targetId, limit: 50 } });
  };

  const onTag = () => setTagOpen(true);
  const onSaveTag = async () => {
    await tagEntity({ variables: { entityId: contextMenu.targetId, tag } });
    setTag(''); setTagOpen(false); closeMenu();
  };

  const onSendToAI = async () => {
    closeMenu();
    await requestAI({ variables: { entityId: contextMenu.targetId } });
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
        <MenuItem onClick={onSendToAI}>Send to AI Analysis</MenuItem>
      </Menu>

      <Dialog open={tagOpen} onClose={() => setTagOpen(false)}>
        <DialogTitle>Tag Entity</DialogTitle>
        <DialogContent>
          <TextField label="Tag" fullWidth autoFocus value={tag} onChange={(e) => setTag(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSaveTag} disabled={!tag.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

