/**
 * Command Palette - Global search and quick actions (⌘K)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  InputAdornment,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  History as HistoryIcon,
  FlashOn as ActionIcon,
  Dashboard as DashboardIcon,
  Help as HelpIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  NotificationsActive as AlertIcon,
  Send as SendIcon,
} from '@mui/icons-material';

export interface CommandItem {
  id: string;
  type: 'recent' | 'action' | 'navigation' | 'help';
  icon: React.ReactNode;
  title: string;
  description?: string;
  shortcut?: string;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onCommandSelect: (command: string, args?: Record<string, unknown>) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onCommandSelect,
}) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Default commands
  const defaultCommands: CommandItem[] = useMemo(
    () => [
      // Recent
      {
        id: 'recent-1',
        type: 'recent',
        icon: <HistoryIcon fontSize="small" />,
        title: 'Payment webhook failures event',
      },
      {
        id: 'recent-2',
        type: 'recent',
        icon: <HistoryIcon fontSize="small" />,
        title: 'Acme Corp customer profile',
      },
      // Quick Actions
      {
        id: 'action-situation',
        type: 'action',
        icon: <AddIcon fontSize="small" />,
        title: 'Create new situation',
        shortcut: '⌘N',
      },
      {
        id: 'action-playbook',
        type: 'action',
        icon: <PlayIcon fontSize="small" />,
        title: 'Run playbook...',
      },
      {
        id: 'action-page',
        type: 'action',
        icon: <AlertIcon fontSize="small" />,
        title: 'Page on-call',
      },
      {
        id: 'action-update',
        type: 'action',
        icon: <SendIcon fontSize="small" />,
        title: 'Send team update',
      },
      // Navigation
      {
        id: 'nav-dashboard',
        type: 'navigation',
        icon: <DashboardIcon fontSize="small" />,
        title: 'Dashboard',
        shortcut: '⌘D',
      },
      {
        id: 'nav-situations',
        type: 'navigation',
        icon: <DashboardIcon fontSize="small" />,
        title: 'Active Situations',
      },
      {
        id: 'nav-timeline',
        type: 'navigation',
        icon: <DashboardIcon fontSize="small" />,
        title: 'Event Timeline',
      },
      // Help
      {
        id: 'help-shortcuts',
        type: 'help',
        icon: <HelpIcon fontSize="small" />,
        title: 'Keyboard shortcuts',
        shortcut: '?',
      },
      {
        id: 'help-docs',
        type: 'help',
        icon: <HelpIcon fontSize="small" />,
        title: 'Documentation',
      },
    ],
    []
  );

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return defaultCommands;

    const lowerQuery = query.toLowerCase();
    return defaultCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery)
    );
  }, [query, defaultCommands]);

  // Group commands by type
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {
      recent: [],
      action: [],
      navigation: [],
      help: [],
    };

    filteredCommands.forEach((cmd) => {
      if (groups[cmd.type]) {
        groups[cmd.type].push(cmd);
      }
    });

    return groups;
  }, [filteredCommands]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleSelect(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  const handleSelect = (command: CommandItem) => {
    onCommandSelect(command.id, { query });
    onClose();
  };

  const getGroupTitle = (type: string): string => {
    switch (type) {
      case 'recent':
        return 'Recent';
      case 'action':
        return 'Quick Actions';
      case 'navigation':
        return 'Navigation';
      case 'help':
        return 'Help';
      default:
        return type;
    }
  };

  let currentIndex = -1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'absolute',
          top: '20%',
          borderRadius: 2,
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search Input */}
        <TextField
          autoFocus
          fullWidth
          placeholder="Search or type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            sx: {
              py: 1.5,
              px: 2,
              '& fieldset': { border: 'none' },
            },
          }}
        />

        <Divider />

        {/* Command List */}
        <List sx={{ maxHeight: 400, overflowY: 'auto', py: 1 }}>
          {Object.entries(groupedCommands).map(
            ([type, commands]) =>
              commands.length > 0 && (
                <Box key={type}>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ px: 2, py: 1, display: 'block', fontWeight: 600 }}
                  >
                    {getGroupTitle(type)}
                  </Typography>

                  {commands.map((command) => {
                    currentIndex++;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <ListItem
                        key={command.id}
                        onClick={() => handleSelect(command)}
                        sx={{
                          px: 2,
                          py: 1,
                          cursor: 'pointer',
                          bgcolor: isSelected
                            ? theme.palette.action.selected
                            : 'transparent',
                          '&:hover': {
                            bgcolor: theme.palette.action.hover,
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {command.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={command.title}
                          secondary={command.description}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        {command.shortcut && (
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{
                              bgcolor: theme.palette.grey[100],
                              px: 1,
                              py: 0.25,
                              borderRadius: 0.5,
                              fontFamily: 'monospace',
                            }}
                          >
                            {command.shortcut}
                          </Typography>
                        )}
                      </ListItem>
                    );
                  })}
                </Box>
              )
          )}

          {filteredCommands.length === 0 && (
            <Box textAlign="center" py={3}>
              <Typography color="textSecondary">No results found</Typography>
            </Box>
          )}
        </List>

        {/* Footer */}
        <Divider />
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={2}
          py={1}
          px={2}
          bgcolor={theme.palette.grey[50]}
        >
          <Typography variant="caption" color="textSecondary">
            ↑↓ Navigate
          </Typography>
          <Typography variant="caption" color="textSecondary">
            ↵ Select
          </Typography>
          <Typography variant="caption" color="textSecondary">
            esc Close
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
