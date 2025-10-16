import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useFocusTrap } from '../utils/useFocusTrap';
import PolicyExplain from './PolicyExplain';
export default function PolicyExplainDialog({ open, onClose, context }) {
  const ref = useRef(null);
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return _jsx(Dialog, {
    open: open,
    onClose: onClose,
    'aria-modal': 'true',
    'aria-labelledby': 'policy-explain-title',
    maxWidth: 'md',
    fullWidth: true,
    children: _jsxs('div', {
      ref: ref,
      children: [
        _jsx(DialogTitle, {
          id: 'policy-explain-title',
          children: 'Policy Explain',
        }),
        _jsx(DialogContent, {
          dividers: true,
          children: _jsx(PolicyExplain, { context: context }),
        }),
        _jsx(DialogActions, {
          children: _jsx(Button, { onClick: onClose, children: 'Close' }),
        }),
      ],
    }),
  });
}
