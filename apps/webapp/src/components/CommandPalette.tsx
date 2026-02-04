import { Dialog, DialogTitle, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ClearIcon from '@mui/icons-material/Clear';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, selectNode, setTimeRange } from '../store';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  toggleTheme: () => void;
  mode: 'light' | 'dark';
}

export function CommandPalette({ open, onClose, toggleTheme, mode }: CommandPaletteProps) {
  const dispatch = useDispatch();
  const { selectedNodeId, timeRange } = useSelector((state: RootState) => state.selection);

  const exec = (fn: () => void) => { fn(); onClose(); };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Command Palette</DialogTitle>
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => exec(toggleTheme)}>
            <ListItemIcon>{mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}</ListItemIcon>
            <ListItemText primary={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'} />
          </ListItemButton>
        </ListItem>
        {selectedNodeId && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => exec(() => dispatch(selectNode(null)))}>
              <ListItemIcon><ClearIcon /></ListItemIcon>
              <ListItemText primary="Clear Node Selection" secondary={`Selected: ${selectedNodeId}`} />
            </ListItemButton>
          </ListItem>
        )}
        {timeRange && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => exec(() => dispatch(setTimeRange(null)))}>
              <ListItemIcon><DateRangeIcon /></ListItemIcon>
              <ListItemText primary="Reset Time Range" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Dialog>
  );
}
