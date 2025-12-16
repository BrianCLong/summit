/**
 * Control Tower Dashboard - Main operational command center
 * @module @intelgraph/web/pages/control-tower
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import { HealthScoreCard } from '../../components/control-tower/HealthScoreCard';
import { ActiveSituations } from '../../components/control-tower/ActiveSituations';
import { KeyMetricsGrid } from '../../components/control-tower/KeyMetricsGrid';
import { TeamPulse } from '../../components/control-tower/TeamPulse';
import { EventTimeline } from '../../components/control-tower/EventTimeline';
import { CommandPalette } from '../../components/control-tower/CommandPalette';
import { EventDetailPanel } from '../../components/control-tower/EventDetailPanel';
import { useControlTowerData } from '../../hooks/useControlTowerData';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export interface ControlTowerDashboardProps {
  /** Initial filter state */
  initialFilters?: EventFilterState;
}

export interface EventFilterState {
  severity?: string[];
  status?: string[];
  category?: string[];
  source?: string[];
  timeRange?: string;
  searchQuery?: string;
}

export const ControlTowerDashboard: React.FC<ControlTowerDashboardProps> = ({
  initialFilters = {},
}) => {
  const theme = useTheme();

  // State
  const [filters, setFilters] = useState<EventFilterState>(initialFilters);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);

  // Data fetching
  const {
    healthScore,
    keyMetrics,
    teamPulse,
    activeSituations,
    events,
    isLoading,
    error,
    refetch,
  } = useControlTowerData(filters);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'mod+k': () => setCommandPaletteOpen(true),
    'mod+f': () => setFilterPanelOpen(true),
    'escape': () => {
      setSelectedEventId(null);
      setCommandPaletteOpen(false);
      setFilterPanelOpen(false);
    },
  });

  // Handlers
  const handleEventSelect = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
  }, []);

  const handleEventClose = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<EventFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCommandSelect = useCallback((command: string, args?: Record<string, unknown>) => {
    setCommandPaletteOpen(false);

    switch (command) {
      case 'search':
        handleFilterChange({ searchQuery: args?.query as string });
        break;
      case 'filter':
        setFilterPanelOpen(true);
        break;
      case 'refresh':
        handleRefresh();
        break;
      default:
        console.log('Command:', command, args);
    }
  }, [handleFilterChange, handleRefresh]);

  if (error) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="error" variant="h6">
          Error loading Control Tower data
        </Typography>
        <Typography color="textSecondary">{error.message}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.default,
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h5" fontWeight={600}>
            🎯 Control Tower
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {/* Search Button */}
          <Tooltip title="Search (⌘K)">
            <IconButton onClick={() => setCommandPaletteOpen(true)}>
              <SearchIcon />
            </IconButton>
          </Tooltip>

          {/* Filter Button */}
          <Tooltip title="Filters">
            <IconButton onClick={() => setFilterPanelOpen(true)}>
              <FilterIcon />
            </IconButton>
          </Tooltip>

          {/* Refresh Button */}
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
        }}
      >
        {/* Health Score */}
        <Box mb={3}>
          <HealthScoreCard
            score={healthScore?.score ?? 0}
            trend={healthScore?.trend ?? 'STABLE'}
            change={healthScore?.change ?? 0}
            components={healthScore?.components ?? []}
            isLoading={isLoading}
          />
        </Box>

        {/* Active Situations & Key Metrics */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={5}>
            <ActiveSituations
              situations={activeSituations}
              onSituationClick={(id) => console.log('Situation clicked:', id)}
              isLoading={isLoading}
            />
          </Grid>

          <Grid item xs={12} md={7}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <KeyMetricsGrid metrics={keyMetrics} isLoading={isLoading} />
              </Grid>
              <Grid item xs={12}>
                <TeamPulse members={teamPulse} isLoading={isLoading} />
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Event Timeline */}
        <EventTimeline
          events={events}
          filters={filters}
          onFilterChange={handleFilterChange}
          onEventSelect={handleEventSelect}
          selectedEventId={selectedEventId}
          isLoading={isLoading}
        />
      </Box>

      {/* Command Palette */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onCommandSelect={handleCommandSelect}
      />

      {/* Event Detail Panel */}
      <EventDetailPanel
        eventId={selectedEventId}
        open={!!selectedEventId}
        onClose={handleEventClose}
      />
    </Box>
  );
};

export default ControlTowerDashboard;
