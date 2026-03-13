/**
 * Summit War Room — Canvas
 *
 * The main workspace area with a dynamic grid layout.
 * Panels are arranged using react-grid-layout and can be
 * resized, rearranged, docked, and toggled.
 */

import React, { useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import HubIcon from '@mui/icons-material/Hub';
import TimelineIcon from '@mui/icons-material/Timeline';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SourceIcon from '@mui/icons-material/Source';
import TerminalIcon from '@mui/icons-material/Terminal';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ScienceIcon from '@mui/icons-material/Science';
import FeedIcon from '@mui/icons-material/Feed';
import NotesIcon from '@mui/icons-material/Notes';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { useWarRoomStore } from './store';
import { GraphCanvas } from './graph/GraphCanvas';
import { TimelineCanvas } from './timeline/TimelineCanvas';
import { AgentConsole } from './agents/AgentConsole';
import { SimulationBuilder } from './simulation/SimulationBuilder';
import { EvidencePanel } from './evidence/EvidencePanel';
import type { PanelId, PanelState } from './types';

const ResponsiveGridLayout = WidthProvider(Responsive);

/* ------------------------------------------------------------------ */
/*  Panel registry                                                     */
/* ------------------------------------------------------------------ */

const PANEL_TITLES: Record<PanelId, string> = {
  'graph': 'Graph Intelligence',
  'timeline': 'Timeline Fusion',
  'entity-inspector': 'Entity Inspector',
  'evidence': 'Evidence',
  'query-console': 'Query Console',
  'agent-console': 'Agent Console',
  'simulation': 'Simulation',
  'activity-feed': 'Activity Feed',
  'investigation-notes': 'Investigation Notes',
  'narrative-builder': 'Narrative Builder',
};

const PANEL_ICONS: Record<PanelId, React.ReactNode> = {
  'graph': <HubIcon sx={{ fontSize: 14 }} />,
  'timeline': <TimelineIcon sx={{ fontSize: 14 }} />,
  'entity-inspector': <PersonSearchIcon sx={{ fontSize: 14 }} />,
  'evidence': <SourceIcon sx={{ fontSize: 14 }} />,
  'query-console': <TerminalIcon sx={{ fontSize: 14 }} />,
  'agent-console': <SmartToyIcon sx={{ fontSize: 14 }} />,
  'simulation': <ScienceIcon sx={{ fontSize: 14 }} />,
  'activity-feed': <FeedIcon sx={{ fontSize: 14 }} />,
  'investigation-notes': <NotesIcon sx={{ fontSize: 14 }} />,
  'narrative-builder': <AutoStoriesIcon sx={{ fontSize: 14 }} />,
};

/* ------------------------------------------------------------------ */
/*  Panel content renderer                                             */
/* ------------------------------------------------------------------ */

const PanelContent: React.FC<{ id: PanelId }> = React.memo(({ id }) => {
  switch (id) {
    case 'graph':
      return <GraphCanvas />;
    case 'timeline':
      return <TimelineCanvas />;
    case 'agent-console':
      return <AgentConsole />;
    case 'simulation':
      return <SimulationBuilder />;
    case 'evidence':
      return <EvidencePanel />;
    case 'entity-inspector':
      return <EntityInspectorPlaceholder />;
    case 'query-console':
      return <QueryConsolePlaceholder />;
    case 'activity-feed':
      return <ActivityFeedPlaceholder />;
    case 'investigation-notes':
      return <InvestigationNotesPlaceholder />;
    case 'narrative-builder':
      return <NarrativeBuilderPlaceholder />;
    default:
      return null;
  }
});

/* Lightweight placeholders for panels that delegate to separate files */
const EntityInspectorPlaceholder: React.FC = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="body2" color="text.secondary">
      Select an entity on the graph to inspect its properties, relationships, and evidence.
    </Typography>
  </Box>
);

const QueryConsolePlaceholder: React.FC = () => (
  <Box sx={{ p: 2, fontFamily: 'monospace' }}>
    <Typography variant="body2" color="text.secondary">
      Cypher query console — run queries against the IntelGraph Neo4j backend.
    </Typography>
    <Box
      component="textarea"
      sx={{
        width: '100%',
        mt: 1,
        p: 1,
        bgcolor: 'background.default',
        color: 'text.primary',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        fontFamily: 'monospace',
        fontSize: 12,
        resize: 'vertical',
        minHeight: 80,
      }}
      placeholder="MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100"
    />
  </Box>
);

const ActivityFeedPlaceholder: React.FC = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h6">Activity Feed</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      Real-time stream of investigation events, agent actions, and collaborator activity.
    </Typography>
  </Box>
);

const InvestigationNotesPlaceholder: React.FC = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h6">Investigation Notes</Typography>
    <Box
      component="textarea"
      sx={{
        width: '100%',
        mt: 1,
        p: 1,
        bgcolor: 'background.default',
        color: 'text.primary',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        fontFamily: 'inherit',
        fontSize: 13,
        resize: 'vertical',
        minHeight: 200,
      }}
      placeholder="Write investigation notes here..."
    />
  </Box>
);

const NarrativeBuilderPlaceholder: React.FC = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h6">Narrative Builder</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      Construct intelligence narratives from timeline events and evidence.
    </Typography>
  </Box>
);

/* ------------------------------------------------------------------ */
/*  Canvas                                                             */
/* ------------------------------------------------------------------ */

export const WarRoomCanvas: React.FC = () => {
  const panels = useWarRoomStore((s) => s.panels);
  const updatePanelLayout = useWarRoomStore((s) => s.updatePanelLayout);
  const togglePanel = useWarRoomStore((s) => s.togglePanel);

  const visiblePanels = useMemo(() => panels.filter((p) => p.visible), [panels]);

  const layout: Layout[] = useMemo(
    () =>
      visiblePanels.map((p) => ({
        i: p.id,
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        minW: 2,
        minH: 2,
      })),
    [visiblePanels],
  );

  const onLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      const updated: PanelState[] = panels.map((p) => {
        const found = newLayout.find((l) => l.i === p.id);
        if (found) {
          return { ...p, x: found.x, y: found.y, w: found.w, h: found.h };
        }
        return p;
      });
      updatePanelLayout(updated);
    },
    [panels, updatePanelLayout],
  );

  return (
    <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default', p: 0.5 }}>
      <ResponsiveGridLayout
        className="war-room-grid"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={80}
        isDraggable
        isResizable
        compactType="vertical"
        onLayoutChange={onLayoutChange}
        draggableHandle=".panel-drag-handle"
      >
        {visiblePanels.map((panel) => (
          <Box key={panel.id}>
            <Paper
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Panel header */}
              <Box
                className="panel-drag-handle"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  py: 0.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  cursor: 'grab',
                  userSelect: 'none',
                  gap: 0.5,
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                {PANEL_ICONS[panel.id]}
                <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>
                  {PANEL_TITLES[panel.id]}
                </Typography>
                <Tooltip title="Close panel">
                  <IconButton size="small" onClick={() => togglePanel(panel.id)} sx={{ p: 0.25 }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Panel body */}
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <PanelContent id={panel.id} />
              </Box>
            </Paper>
          </Box>
        ))}
      </ResponsiveGridLayout>
    </Box>
  );
};
