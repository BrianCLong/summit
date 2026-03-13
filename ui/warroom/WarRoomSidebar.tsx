/**
 * Summit War Room — Sidebar
 *
 * Navigation sidebar with panel toggles, investigation list,
 * agent status, and settings.
 */

import React from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import Badge from '@mui/material/Badge';
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
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import { useWarRoomStore } from './store';
import type { PanelId, WarRoomState } from './types';

const PANEL_META: { id: PanelId; label: string; icon: React.ReactNode }[] = [
  { id: 'graph', label: 'Graph Canvas', icon: <HubIcon fontSize="small" /> },
  { id: 'timeline', label: 'Timeline', icon: <TimelineIcon fontSize="small" /> },
  { id: 'entity-inspector', label: 'Entity Inspector', icon: <PersonSearchIcon fontSize="small" /> },
  { id: 'evidence', label: 'Evidence', icon: <SourceIcon fontSize="small" /> },
  { id: 'query-console', label: 'Query Console', icon: <TerminalIcon fontSize="small" /> },
  { id: 'agent-console', label: 'Agent Console', icon: <SmartToyIcon fontSize="small" /> },
  { id: 'simulation', label: 'Simulation', icon: <ScienceIcon fontSize="small" /> },
  { id: 'activity-feed', label: 'Activity Feed', icon: <FeedIcon fontSize="small" /> },
  { id: 'investigation-notes', label: 'Notes', icon: <NotesIcon fontSize="small" /> },
  { id: 'narrative-builder', label: 'Narrative', icon: <AutoStoriesIcon fontSize="small" /> },
];

/* ------------------------------------------------------------------ */
/*  Panels Tab                                                         */
/* ------------------------------------------------------------------ */

const PanelsTab: React.FC = () => {
  const panels = useWarRoomStore((s) => s.panels);
  const togglePanel = useWarRoomStore((s) => s.togglePanel);

  return (
    <List dense disablePadding>
      {PANEL_META.map((meta) => {
        const panel = panels.find((p) => p.id === meta.id);
        return (
          <ListItemButton key={meta.id} onClick={() => togglePanel(meta.id)} sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>{meta.icon}</ListItemIcon>
            <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={meta.label} />
            <Switch size="small" checked={panel?.visible ?? false} tabIndex={-1} />
          </ListItemButton>
        );
      })}
    </List>
  );
};

/* ------------------------------------------------------------------ */
/*  Investigations Tab                                                 */
/* ------------------------------------------------------------------ */

const InvestigationsTab: React.FC = () => {
  const investigations = useWarRoomStore((s) => s.investigations);
  const setActive = useWarRoomStore((s) => s.setActiveInvestigation);
  const activeId = useWarRoomStore((s) => s.activeInvestigation?.id);

  return (
    <List dense disablePadding>
      {investigations.length === 0 && (
        <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
          No investigations yet
        </Typography>
      )}
      {investigations.map((inv) => (
        <ListItemButton
          key={inv.id}
          selected={inv.id === activeId}
          onClick={() => setActive(inv)}
          sx={{ py: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <FolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={inv.title} />
          <Chip label={inv.status} size="small" sx={{ height: 18, fontSize: 10 }} />
        </ListItemButton>
      ))}
    </List>
  );
};

/* ------------------------------------------------------------------ */
/*  Agents Tab                                                         */
/* ------------------------------------------------------------------ */

const AgentsTab: React.FC = () => {
  const agentTasks = useWarRoomStore((s) => s.agentTasks);
  const running = agentTasks.filter((t) => t.status === 'running');

  return (
    <List dense disablePadding>
      {agentTasks.length === 0 && (
        <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
          No agent tasks
        </Typography>
      )}
      {agentTasks.map((task) => (
        <ListItemButton key={task.id} sx={{ py: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Badge
              color={task.status === 'running' ? 'success' : task.status === 'failed' ? 'error' : 'default'}
              variant="dot"
            >
              <SmartToyIcon fontSize="small" />
            </Badge>
          </ListItemIcon>
          <ListItemText
            primary={task.agentName}
            secondary={`${task.status} — ${task.progress}%`}
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItemButton>
      ))}
    </List>
  );
};

/* ------------------------------------------------------------------ */
/*  Settings Tab                                                       */
/* ------------------------------------------------------------------ */

const SettingsTab: React.FC = () => {
  const themeMode = useWarRoomStore((s) => s.themeMode);
  const toggleTheme = useWarRoomStore((s) => s.toggleTheme);
  const savedLayouts = useWarRoomStore((s) => s.savedLayouts);
  const loadLayout = useWarRoomStore((s) => s.loadLayout);

  return (
    <Box sx={{ px: 2, py: 1 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Theme
      </Typography>
      <ListItemButton onClick={toggleTheme} sx={{ borderRadius: 1, mb: 2 }}>
        <ListItemIcon sx={{ minWidth: 32 }}>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={themeMode === 'dark' ? 'Dark Intelligence Mode' : 'Light Analysis Mode'}
          primaryTypographyProps={{ variant: 'body2' }}
        />
      </ListItemButton>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Saved Layouts
      </Typography>
      {savedLayouts.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          No saved layouts
        </Typography>
      )}
      <List dense disablePadding>
        {savedLayouts.map((layout) => (
          <ListItemButton key={layout.id} onClick={() => loadLayout(layout.id)} sx={{ py: 0.5, borderRadius: 1 }}>
            <ListItemText primary={layout.name} primaryTypographyProps={{ variant: 'body2' }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

const TAB_MAP: Record<WarRoomState['sidebarTab'], React.ReactNode> = {
  panels: <PanelsTab />,
  investigations: <InvestigationsTab />,
  agents: <AgentsTab />,
  settings: <SettingsTab />,
};

export const WarRoomSidebar: React.FC = () => {
  const sidebarOpen = useWarRoomStore((s) => s.sidebarOpen);
  const sidebarTab = useWarRoomStore((s) => s.sidebarTab);
  const setSidebarTab = useWarRoomStore((s) => s.setSidebarTab);
  const agentTasks = useWarRoomStore((s) => s.agentTasks);
  const runningCount = agentTasks.filter((t) => t.status === 'running').length;

  if (!sidebarOpen) return null;

  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Tabs
        value={sidebarTab}
        onChange={(_, v) => setSidebarTab(v)}
        variant="fullWidth"
        sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Panels" value="panels" />
        <Tab label="Cases" value="investigations" />
        <Tab
          label={
            <Badge badgeContent={runningCount} color="success" sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 14, minWidth: 14 } }}>
              Agents
            </Badge>
          }
          value="agents"
        />
        <Tab label="Settings" value="settings" icon={<SettingsIcon sx={{ fontSize: 14 }} />} iconPosition="end" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto' }}>{TAB_MAP[sidebarTab]}</Box>
    </Box>
  );
};
