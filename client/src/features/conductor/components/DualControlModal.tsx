import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from '@mui/material';

export function DualControlModal({
  open,
  onClose,
  onConfirm,
  actionLabel = 'Confirm',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { justification: string; approver: string }) => void;
  actionLabel?: string;
}) {
  const [justification, setJustification] = useState('');
  const [approver, setApprover] = useState('');

  const valid = justification.trim().length > 5 && /@/.test(approver);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Dual Control Required</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Provide a justification and an approver (email) to proceed. This
          action is audited.
        </Typography>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            multiline
            minRows={2}
            placeholder="Why is this safe and necessary?"
          />
          <TextField
            label="Second approver (email)"
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
            placeholder="name@example.com"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          disabled={!valid}
          variant="contained"
          onClick={() => onConfirm({ justification, approver })}
        >
          {actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
