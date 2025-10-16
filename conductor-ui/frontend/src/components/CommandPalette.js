import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { Dialog, TextField, Box, Typography } from '@mui/material';
import { useEffect, useState, useRef } from 'react';
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        if (!o) {
          // If opening, focus the input after a short delay
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    setOutput(null);
    setError(null);
    const [justfile, target, ...argsArray] = command.split(' ');
    const args = argsArray.join(' ');
    try {
      const response = await fetch(
        'http://localhost:3001/api/run-just-command',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ justfile, target, args }),
        },
      );
      const data = await response.json();
      if (response.ok) {
        setOutput(
          data.stdout || data.stderr || 'Command executed successfully.',
        );
      } else {
        setError(data.stderr || data.error || 'Failed to execute command.');
      }
    } catch (e) {
      setError(`Network error: ${e.message}`);
    }
  };
  return _jsx(Dialog, {
    open: open,
    onClose: () => setOpen(false),
    maxWidth: 'md',
    fullWidth: true,
    children: _jsxs(Box, {
      sx: { p: 2 },
      children: [
        _jsx(Typography, {
          variant: 'h6',
          gutterBottom: true,
          children: 'Command Palette',
        }),
        _jsx('form', {
          onSubmit: handleCommandSubmit,
          children: _jsx(TextField, {
            inputRef: inputRef,
            fullWidth: true,
            variant: 'outlined',
            placeholder:
              'Enter just command (e.g., Justfile.orchestra dash-refresh)',
            value: command,
            onChange: (e) => setCommand(e.target.value),
            sx: { mb: 2 },
          }),
        }),
        output &&
          _jsxs(Box, {
            sx: {
              bgcolor: '#eee',
              p: 1,
              borderRadius: 1,
              mt: 1,
              whiteSpace: 'pre-wrap',
              maxHeight: 200,
              overflowY: 'auto',
            },
            children: [
              _jsx(Typography, { variant: 'body2', children: 'Output:' }),
              _jsx(Typography, {
                variant: 'body2',
                component: 'pre',
                children: output,
              }),
            ],
          }),
        error &&
          _jsxs(Box, {
            sx: {
              bgcolor: '#fdd',
              p: 1,
              borderRadius: 1,
              mt: 1,
              whiteSpace: 'pre-wrap',
              maxHeight: 200,
              overflowY: 'auto',
            },
            children: [
              _jsx(Typography, {
                variant: 'body2',
                color: 'error',
                children: 'Error:',
              }),
              _jsx(Typography, {
                variant: 'body2',
                component: 'pre',
                color: 'error',
                children: error,
              }),
            ],
          }),
      ],
    }),
  });
}
