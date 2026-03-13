/**
 * Summit War Room — Command Palette
 *
 * Global command palette (Ctrl+K) for searching entities,
 * running graph queries, launching agents, opening investigations,
 * and triggering simulations.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import InputBase from '@mui/material/InputBase';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import SearchIcon from '@mui/icons-material/Search';
import HubIcon from '@mui/icons-material/Hub';
import TerminalIcon from '@mui/icons-material/Terminal';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import FolderIcon from '@mui/icons-material/Folder';
import ScienceIcon from '@mui/icons-material/Science';
import ExploreIcon from '@mui/icons-material/Explore';
import { useWarRoomStore } from './store';
import type { CommandItem } from './types';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  entity: <HubIcon fontSize="small" />,
  query: <TerminalIcon fontSize="small" />,
  agent: <SmartToyIcon fontSize="small" />,
  investigation: <FolderIcon fontSize="small" />,
  simulation: <ScienceIcon fontSize="small" />,
  navigation: <ExploreIcon fontSize="small" />,
};

const CATEGORY_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  entity: 'primary',
  query: 'info',
  agent: 'success',
  investigation: 'warning',
  simulation: 'secondary',
  navigation: 'info',
};

export const WarRoomCommandPalette: React.FC = () => {
  const open = useWarRoomStore((s) => s.commandPaletteOpen);
  const toggleCommandPalette = useWarRoomStore((s) => s.toggleCommandPalette);
  const commands = useWarRoomStore((s) => s.commands);
  const entities = useWarRoomStore((s) => s.entities);
  const investigations = useWarRoomStore((s) => s.investigations);
  const setSelectedEntity = useWarRoomStore((s) => s.setSelectedEntity);
  const setActiveInvestigation = useWarRoomStore((s) => s.setActiveInvestigation);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build dynamic command list from registered commands + entities + investigations
  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [...commands];

    // Add entities as searchable commands
    entities.slice(0, 200).forEach((e) => {
      items.push({
        id: `entity-${e.id}`,
        label: `${e.label} (${e.type})`,
        category: 'entity',
        action: () => setSelectedEntity(e.id),
      });
    });

    // Add investigations
    investigations.forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        label: inv.title,
        category: 'investigation',
        action: () => setActiveInvestigation(inv),
      });
    });

    return items;
  }, [commands, entities, investigations, setSelectedEntity, setActiveInvestigation]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 20);
    const lower = query.toLowerCase();
    return allItems
      .filter((item) => item.label.toLowerCase().includes(lower) || item.category.includes(lower))
      .slice(0, 20);
  }, [allItems, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
      toggleCommandPalette();
    } else if (e.key === 'Escape') {
      toggleCommandPalette();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={toggleCommandPalette}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          mt: '10vh',
          alignSelf: 'flex-start',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search entities, run queries, launch agents..."
          sx={{ flex: 1, fontSize: 14 }}
          fullWidth
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
          Esc to close
        </Typography>
      </Box>

      <DialogContent sx={{ p: 0, maxHeight: 400 }}>
        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No results found
          </Typography>
        )}
        <List dense disablePadding>
          {filtered.map((item, idx) => (
            <ListItemButton
              key={item.id}
              selected={idx === selectedIndex}
              onClick={() => {
                item.action();
                toggleCommandPalette();
              }}
              sx={{ py: 0.75 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {CATEGORY_ICONS[item.category] ?? <ExploreIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />
              <Chip
                label={item.category}
                size="small"
                color={CATEGORY_COLORS[item.category] ?? 'default'}
                sx={{ height: 18, fontSize: 10 }}
              />
              {item.shortcut && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {item.shortcut}
                </Typography>
              )}
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
};
