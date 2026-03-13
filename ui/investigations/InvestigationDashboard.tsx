/**
 * Summit War Room — Investigation Dashboard
 *
 * Overview of all investigations with filtering, sorting,
 * and quick-access to investigation workspaces.
 */

import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import { useWarRoomStore } from '../warroom/store';
import type { Investigation, InvestigationStatus, Priority } from '../warroom/types';

const STATUS_COLORS: Record<InvestigationStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  active: 'info',
  review: 'warning',
  closed: 'success',
  archived: 'default',
};

const PRIORITY_COLORS: Record<Priority, 'default' | 'error' | 'warning' | 'info'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

export const InvestigationDashboard: React.FC = () => {
  const investigations = useWarRoomStore((s) => s.investigations);
  const addInvestigation = useWarRoomStore((s) => s.addInvestigation);
  const setActiveInvestigation = useWarRoomStore((s) => s.setActiveInvestigation);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvestigationStatus | 'all'>('all');

  const filtered = useMemo(
    () =>
      investigations.filter((inv) => {
        if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
        if (search && !inv.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [investigations, search, statusFilter],
  );

  const createInvestigation = () => {
    const inv: Investigation = {
      id: `inv-${Date.now()}`,
      title: 'New Investigation',
      description: '',
      status: 'draft',
      priority: 'medium',
      tags: [],
      createdBy: 'current-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entities: [],
      evidenceIds: [],
      hypotheses: [],
      timelineEvents: [],
    };
    addInvestigation(inv);
    setActiveInvestigation(inv);
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h3" sx={{ flex: 1 }}>
          Investigations
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={createInvestigation}>
          New Case
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search investigations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 13 } }}
        />
        <Select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvestigationStatus | 'all')}
          sx={{ width: 140, fontSize: 13 }}
        >
          <MenuItem value="all">All Status</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="review">Review</MenuItem>
          <MenuItem value="closed">Closed</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </Select>
      </Box>

      {/* Investigation cards */}
      <Grid container spacing={1.5}>
        {filtered.map((inv) => (
          <Grid item xs={12} md={6} lg={4} key={inv.id}>
            <Paper
              sx={{
                p: 1.5,
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main' },
                transition: 'border-color 150ms ease',
              }}
              onClick={() => setActiveInvestigation(inv)}
            >
              <Typography variant="h4" sx={{ mb: 0.5 }}>
                {inv.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                <Chip label={inv.status} size="small" color={STATUS_COLORS[inv.status]} />
                <Chip label={inv.priority} size="small" color={PRIORITY_COLORS[inv.priority]} variant="outlined" />
                {inv.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" sx={{ fontSize: 10 }} />
                ))}
              </Box>
              <Typography variant="body2" color="text.secondary" noWrap>
                {inv.description || 'No description'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {inv.entities.length} entities | {inv.evidenceIds.length} evidence | {inv.hypotheses.length} hypotheses
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {filtered.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          No investigations found. Create a new case to get started.
        </Typography>
      )}
    </Box>
  );
};
