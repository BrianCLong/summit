import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

type Command = { id: string; title: string; hint?: string; action: () => void };

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'runbooks',
        title: 'Open Runbooks',
        action: () => navigate('/conductor'),
      },
      {
        id: 'rollouts',
        title: 'View Rollouts',
        action: () => navigate('/conductor'),
      },
      {
        id: 'slo',
        title: 'Open SLO Dashboard',
        action: () => navigate('/conductor'),
      },
      {
        id: 'entities',
        title: 'Search Entities',
        action: () => navigate('/search'),
      },
      {
        id: 'graph',
        title: 'Open Graph Explorer',
        action: () => navigate('/graph'),
      },
    ],
    [navigate],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.title.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!open) onClose(); // ensure re-render to open from parent
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Command Palette — type to filter, Enter to execute (Esc to close)
        </Typography>
        <TextField
          autoFocus
          fullWidth
          placeholder="Jump to… (runbooks, rollouts, SLO, graph)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <List dense>
          {filtered.map((c) => (
            <ListItemButton
              key={c.id}
              onClick={() => {
                c.action();
                onClose();
              }}
            >
              <ListItemText primary={c.title} secondary={c.hint} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
