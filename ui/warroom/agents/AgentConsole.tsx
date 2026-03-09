/**
 * Summit War Room — Agent Console
 *
 * Launch, monitor, and inspect AI agent tasks.
 * Shows real-time progress, reasoning traces, and agent decisions.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Badge from '@mui/material/Badge';
import Divider from '@mui/material/Divider';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useWarRoomStore } from '../store';
import { AgentTrajectoryViewer } from './AgentTrajectoryViewer';
import type { AgentTask } from '../types';

const AGENT_TYPES = [
  { value: 'osint-collector', label: 'OSINT Collector' },
  { value: 'entity-resolver', label: 'Entity Resolver' },
  { value: 'pattern-detector', label: 'Pattern Detector' },
  { value: 'threat-assessor', label: 'Threat Assessor' },
  { value: 'link-analyst', label: 'Link Analyst' },
  { value: 'narrative-builder', label: 'Narrative Builder' },
];

const STATUS_COLORS: Record<string, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  idle: 'default',
  running: 'info',
  paused: 'warning',
  completed: 'success',
  failed: 'error',
};

export const AgentConsole: React.FC = () => {
  const agentTasks = useWarRoomStore((s) => s.agentTasks);
  const addAgentTask = useWarRoomStore((s) => s.addAgentTask);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [agentType, setAgentType] = useState('osint-collector');
  const [taskInput, setTaskInput] = useState('');

  const launchAgent = () => {
    if (!taskInput.trim()) return;
    const task: AgentTask = {
      id: `task-${Date.now()}`,
      agentId: `agent-${agentType}`,
      agentName: AGENT_TYPES.find((t) => t.value === agentType)?.label ?? agentType,
      type: agentType,
      status: 'running',
      input: { query: taskInput.trim() },
      reasoning: [],
      startedAt: new Date().toISOString(),
      progress: 0,
    };
    addAgentTask(task);
    setTaskInput('');
    setSelectedTask(task.id);
  };

  const activeTask = agentTasks.find((t) => t.id === selectedTask);

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Task list */}
      <Box sx={{ width: 260, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
        {/* Launch bar */}
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Select
            size="small"
            fullWidth
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            sx={{ mb: 0.5, fontSize: 12 }}
          >
            {AGENT_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value} sx={{ fontSize: 12 }}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            fullWidth
            placeholder="Task description..."
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && launchAgent()}
            sx={{ mb: 0.5, '& .MuiInputBase-input': { fontSize: 12 } }}
          />
          <Button
            size="small"
            variant="contained"
            fullWidth
            startIcon={<PlayArrowIcon />}
            onClick={launchAgent}
            disabled={!taskInput.trim()}
          >
            Launch Agent
          </Button>
        </Box>

        {/* Task list */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List dense disablePadding>
            {agentTasks.map((task) => (
              <ListItemButton
                key={task.id}
                selected={task.id === selectedTask}
                onClick={() => setSelectedTask(task.id)}
                sx={{ py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <Badge color={STATUS_COLORS[task.status]} variant="dot">
                    <SmartToyIcon fontSize="small" />
                  </Badge>
                </ListItemIcon>
                <ListItemText
                  primary={task.agentName}
                  secondary={
                    <Box>
                      <Typography variant="caption">{task.status}</Typography>
                      {task.status === 'running' && (
                        <LinearProgress variant="determinate" value={task.progress} sx={{ mt: 0.25, height: 2 }} />
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>

      {/* Task detail */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!activeTask && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Select a task to view its trajectory and reasoning.
            </Typography>
          </Box>
        )}
        {activeTask && <AgentTrajectoryViewer task={activeTask} />}
      </Box>
    </Box>
  );
};
