/**
 * Summit War Room — Graph Explorer
 *
 * Sidebar for graph exploration: entity filtering, clustering controls,
 * path analysis, and pattern highlighting.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useWarRoomStore } from '../store';

const ENTITY_TYPES = ['person', 'org', 'location', 'event', 'asset', 'document'];

export const GraphExplorer: React.FC = () => {
  const entities = useWarRoomStore((s) => s.entities);
  const setSelectedEntity = useWarRoomStore((s) => s.setSelectedEntity);
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(ENTITY_TYPES));

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filtered = entities.filter((e) => {
    if (!activeTypes.has(e.type)) return false;
    if (search && !e.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search entities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
        />
        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
          {ENTITY_TYPES.map((type) => (
            <Chip
              key={type}
              label={type}
              size="small"
              variant={activeTypes.has(type) ? 'filled' : 'outlined'}
              onClick={() => toggleType(type)}
              sx={{ fontSize: 10 }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Entity counts */}
        <Accordion disableGutters defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="caption" fontWeight={600}>
              Entities ({filtered.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List dense disablePadding>
              {filtered.slice(0, 100).map((entity) => (
                <ListItemButton key={entity.id} onClick={() => setSelectedEntity(entity.id)} sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={entity.label}
                    secondary={entity.type}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItemButton>
              ))}
              {filtered.length > 100 && (
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
                  + {filtered.length - 100} more
                </Typography>
              )}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Path Analysis */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="caption" fontWeight={600}>
              Path Analysis
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              Select two entities on the graph, then click "Find Path" to discover shortest paths between them.
            </Typography>
            <Button size="small" variant="outlined" sx={{ mt: 1 }} disabled>
              Find Path
            </Button>
          </AccordionDetails>
        </Accordion>

        {/* Clustering */}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="caption" fontWeight={600}>
              Clustering
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              Auto-cluster entities by type, relationship density, or community detection.
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
              <Button size="small" variant="outlined">By Type</Button>
              <Button size="small" variant="outlined">By Community</Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};
