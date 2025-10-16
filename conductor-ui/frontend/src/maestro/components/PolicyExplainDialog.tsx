import React, { useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useFocusTrap } from '../utils/useFocusTrap';
import PolicyExplain from './PolicyExplain';

export default function PolicyExplainDialog({
  open,
  onClose,
  context,
}: {
  open: boolean;
  onClose: () => void;
  context: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-modal="true"
      aria-labelledby="policy-explain-title"
      maxWidth="md"
      fullWidth
    >
      <div ref={ref}>
        <DialogTitle id="policy-explain-title">Policy Explain</DialogTitle>
        <DialogContent dividers>
          <PolicyExplain context={context} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}
