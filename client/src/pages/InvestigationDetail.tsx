/**
 * Investigation Detail Page with AI Copilot Integration
 *
 * This is an example integration showing how to wire the CopilotSidebar
 * into the investigation detail view.
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  IconButton,
  Drawer,
  Fab,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  SmartToy as CopilotIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

// Import the copilot sidebar
import CopilotSidebar from '../components/copilot/CopilotSidebar';

// Placeholder components - replace with actual investigation components
import InvestigationHeader from '../components/investigation/InvestigationHeader';
import GraphVisualization from '../components/investigation/GraphVisualization';
import EntityList from '../components/investigation/EntityList';
import TimelineView from '../components/investigation/TimelineView';

// GraphQL query for investigation data
const GET_INVESTIGATION = gql`
  query GetInvestigation($id: ID!) {
    investigation(id: $id) {
      id
      name
      description
      status
      createdAt
      updatedAt
      entities {
        id
        type
        label
      }
      relationships {
        id
        fromEntityId
        toEntityId
        type
      }
    }
  }
`;

export default function InvestigationDetail() {
  const { investigationId } = useParams<{ investigationId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Copilot state
  const [copilotOpen, setCopilotOpen] = useState(!isMobile); // Open by default on desktop
  const [copilotWidth, setCopilotWidth] = useState(400);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Load investigation data
  const { data, loading, error } = useQuery(GET_INVESTIGATION, {
    variables: { id: investigationId },
    skip: !investigationId,
  });

  const investigation = data?.investigation;

  // Handlers
  const handleToggleCopilot = () => {
    setCopilotOpen(!copilotOpen);
  };

  const handleEntityClick = (entityId: string) => {
    setSelectedEntityId(entityId);
    // Optionally navigate or highlight entity
    console.log('Entity clicked:', entityId);
  };

  const handleCopilotResize = (delta: number) => {
    setCopilotWidth((prev) => Math.max(300, Math.min(800, prev + delta)));
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading investigation...</Typography>
      </Container>
    );
  }

  if (error || !investigation) {
    return (
      <Container>
        <Typography color="error">
          Failed to load investigation: {error?.message || 'Not found'}
        </Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Main Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginRight: copilotOpen && !isMobile ? `${copilotWidth}px` : 0,
        }}
      >
        {/* Investigation Header */}
        <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4">{investigation.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {investigation.description}
              </Typography>
            </Box>
            <Box>
              <Tooltip title={copilotOpen ? 'Close Copilot' : 'Open AI Copilot'}>
                <IconButton
                  onClick={handleToggleCopilot}
                  color={copilotOpen ? 'primary' : 'default'}
                  data-testid="copilot-toggle"
                >
                  <CopilotIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Investigation Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <Grid container spacing={2}>
            {/* Graph Visualization */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 2, height: 500 }}>
                <Typography variant="h6" gutterBottom>
                  Network Graph
                </Typography>
                <GraphVisualization
                  entities={investigation.entities}
                  relationships={investigation.relationships}
                  selectedEntityId={selectedEntityId}
                  onEntityClick={handleEntityClick}
                />
              </Paper>
            </Grid>

            {/* Entity List */}
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, height: 500, overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Entities ({investigation.entities.length})
                </Typography>
                <EntityList
                  entities={investigation.entities}
                  selectedEntityId={selectedEntityId}
                  onEntityClick={handleEntityClick}
                />
              </Paper>
            </Grid>

            {/* Timeline */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Timeline
                </Typography>
                <TimelineView investigationId={investigationId!} />
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Floating Action Button for Mobile */}
        {isMobile && !copilotOpen && (
          <Fab
            color="primary"
            aria-label="open copilot"
            onClick={handleToggleCopilot}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
          >
            <CopilotIcon />
          </Fab>
        )}
      </Box>

      {/* Copilot Sidebar */}
      {isMobile ? (
        /* Drawer for Mobile */
        <Drawer
          anchor="right"
          open={copilotOpen}
          onClose={handleToggleCopilot}
          PaperProps={{
            sx: {
              width: '90vw',
              maxWidth: 400,
            },
          }}
        >
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">AI Copilot</Typography>
            <IconButton onClick={handleToggleCopilot} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <CopilotSidebar
              investigationId={investigationId!}
              onEntityClick={handleEntityClick}
            />
          </Box>
        </Drawer>
      ) : (
        /* Fixed Sidebar for Desktop */
        <Box
          sx={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: copilotOpen ? copilotWidth : 0,
            transition: theme.transitions.create(['width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflow: 'hidden',
            zIndex: theme.zIndex.drawer,
          }}
        >
          {copilotOpen && (
            <Box
              sx={{
                display: 'flex',
                height: '100%',
                backgroundColor: theme.palette.background.paper,
                borderLeft: `1px solid ${theme.palette.divider}`,
              }}
            >
              {/* Resize Handle */}
              <Box
                sx={{
                  width: 6,
                  cursor: 'ew-resize',
                  backgroundColor: theme.palette.divider,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.main,
                  },
                }}
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startWidth = copilotWidth;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const delta = startX - moveEvent.clientX;
                    setCopilotWidth(Math.max(300, Math.min(800, startWidth + delta)));
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />

              {/* Copilot Content */}
              <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    p: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ ml: 1 }}>
                    AI Copilot
                  </Typography>
                  <IconButton onClick={handleToggleCopilot} size="small">
                    <ChevronRightIcon />
                  </IconButton>
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <CopilotSidebar
                    investigationId={investigationId!}
                    onEntityClick={handleEntityClick}
                  />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Data attribute for E2E tests */}
      <div data-testid="investigation-loaded" style={{ display: 'none' }} />
    </Box>
  );
}
