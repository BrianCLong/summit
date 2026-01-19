import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  InputAdornment,
} from '@mui/material';
import { useEffect, useState, useMemo } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import ClearIcon from '@mui/icons-material/Clear';
import { useDispatch } from 'react-redux';
import { selectNode } from '../store';

interface CommandPaletteProps {
  onToggleTheme: () => void;
}

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({ onToggleTheme }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dispatch = useDispatch();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'clear-selection',
        label: 'Clear Selection',
        icon: <ClearIcon />,
        action: () => dispatch(selectNode(null)),
      },
      {
        id: 'toggle-theme',
        label: 'Toggle Theme',
        icon: <Brightness4Icon />,
        action: onToggleTheme,
      },
    ],
    [dispatch, onToggleTheme],
  );

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()),
  );

  // Reset selection when query changes or dialog opens
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredCommands.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(
        (i) => (i - 1 + filteredCommands.length) % filteredCommands.length,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        setOpen(false);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { position: 'fixed', top: 50, m: 0 } }}
      aria-label="Command Palette"
    >
      <DialogContent sx={{ p: 0 }}>
        <TextField
          fullWidth
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          variant="standard"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ pl: 2 }}>
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            disableUnderline: true,
            sx: { p: 2, fontSize: '1.1rem' },
          }}
          inputProps={{
            'aria-label': 'Search commands',
            role: 'combobox',
            'aria-autocomplete': 'list',
            'aria-controls': 'command-list',
            'aria-expanded': open,
          }}
        />
        <List sx={{ pt: 0, pb: 1 }} id="command-list" role="listbox">
          {filteredCommands.map((cmd, index) => (
            <ListItem key={cmd.id} disablePadding role="option" aria-selected={index === selectedIndex}>
              <ListItemButton
                selected={index === selectedIndex}
                onClick={() => {
                  cmd.action();
                  setOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <ListItemIcon>{cmd.icon}</ListItemIcon>
                <ListItemText primary={cmd.label} />
              </ListItemButton>
            </ListItem>
          ))}
          {filteredCommands.length === 0 && (
            <ListItem>
              <ListItemText
                primary="No commands found"
                sx={{ textAlign: 'center', color: 'text.secondary' }}
              />
            </ListItem>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}
