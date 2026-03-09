/**
 * Summit War Room — Evidence Panel
 *
 * Browse, search, and manage evidence items with provenance tracking.
 */

import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import ArticleIcon from '@mui/icons-material/Article';
import ImageIcon from '@mui/icons-material/Image';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import PublicIcon from '@mui/icons-material/Public';
import PersonIcon from '@mui/icons-material/Person';
import GavelIcon from '@mui/icons-material/Gavel';
import ExtensionIcon from '@mui/icons-material/Extension';
import { useWarRoomStore } from '../store';
import { SourceInspector } from './SourceInspector';
import type { EvidenceItem } from '../types';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  document: <ArticleIcon fontSize="small" />,
  image: <ImageIcon fontSize="small" />,
  signal: <SignalCellularAltIcon fontSize="small" />,
  osint: <PublicIcon fontSize="small" />,
  humint: <PersonIcon fontSize="small" />,
  testimony: <GavelIcon fontSize="small" />,
  artifact: <ExtensionIcon fontSize="small" />,
};

const RELIABILITY_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  A: 'success',
  B: 'success',
  C: 'info',
  D: 'warning',
  E: 'error',
  F: 'error',
};

export const EvidencePanel: React.FC = () => {
  const evidence = useWarRoomStore((s) => s.evidence);
  const sources = useWarRoomStore((s) => s.sources);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      evidence.filter((e) => {
        if (!search.trim()) return true;
        const lower = search.toLowerCase();
        return e.title.toLowerCase().includes(lower) || e.type.includes(lower) || e.content.toLowerCase().includes(lower);
      }),
    [evidence, search],
  );

  const selected = evidence.find((e) => e.id === selectedId);
  const selectedSource = selected ? sources.find((s) => s.id === selected.sourceId) : null;

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Evidence list */}
      <Box sx={{ width: 280, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search evidence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
          />
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {filtered.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No evidence items
            </Typography>
          )}
          <List dense disablePadding>
            {filtered.map((item) => (
              <ListItemButton
                key={item.id}
                selected={item.id === selectedId}
                onClick={() => setSelectedId(item.id)}
                sx={{ py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>
                  {TYPE_ICONS[item.type] ?? <ExtensionIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  secondary={`${item.type} | ${item.reliability}`}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <Chip
                  label={item.reliability}
                  size="small"
                  color={RELIABILITY_COLORS[item.reliability] ?? 'default'}
                  sx={{ height: 18, fontSize: 9, minWidth: 24 }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>

      {/* Detail */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!selected && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Select an evidence item to view details and provenance.
            </Typography>
          </Box>
        )}
        {selected && (
          <Box sx={{ p: 1.5 }}>
            <Typography variant="h4" sx={{ mb: 0.5 }}>
              {selected.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
              <Chip label={selected.type} size="small" color="primary" />
              <Chip label={`Reliability: ${selected.reliability}`} size="small" color={RELIABILITY_COLORS[selected.reliability] ?? 'default'} />
              <Chip label={selected.classification} size="small" variant="outlined" />
            </Box>
            <Typography variant="body2" sx={{ mb: 1.5, whiteSpace: 'pre-wrap' }}>
              {selected.content}
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <SourceInspector source={selectedSource} provenance={selected.provenance} />
          </Box>
        )}
      </Box>
    </Box>
  );
};
