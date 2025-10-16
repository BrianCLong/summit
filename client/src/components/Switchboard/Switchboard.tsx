'use client';
import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  List,
  ListItem,
  ListItemButton,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Mic,
  Phone,
  Videocam,
  Message,
  RocketLaunch,
  Activity,
  Group,
  Lightbulb,
  Search,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const agents = [
  { id: 'maestro', name: 'Maestro Conductor', tags: ['router', 'exec'] },
  { id: 'codex', name: 'CodeGen Codex', tags: ['dev', 'test'] },
  { id: 'sentinel', name: 'Sentinel CI', tags: ['sec', 'policy'] },
  { id: 'scribe', name: 'Scribe', tags: ['notes', 'transcribe'] },
];

const tiles = [
  {
    id: 'status',
    title: 'System Status',
    metric: 'OK',
    desc: 'All lanes green',
  },
  { id: 'incidents', title: 'Incidents', metric: '0', desc: 'No active' },
  { id: 'deploys', title: 'Deploys', metric: '3', desc: 'prod canary live' },
  { id: 'cost', title: 'LLM Spend', metric: '$42', desc: '24h window' },
];

export default function Switchboard() {
  const [openChat, setOpenChat] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [meeting, setMeeting] = useState(false);
  const [commandInput, setCommandInput] = useState('');

  const handleCommandSelect = (command: string) => {
    if (command.includes('meeting')) {
      setMeeting(true);
    } else if (command.includes('Scribe')) {
      setOpenChat(true);
    }
    setCmdOpen(false);
    setCommandInput('');
  };

  const filteredCommands = [
    'Start meeting',
    'Message Scribe',
    'Open Graph View',
    '/call maestro',
    '/present deck',
    '/join room',
    '/status api',
  ].filter((cmd) => cmd.toLowerCase().includes(commandInput.toLowerCase()));

  return (
    <Box className="grid grid-cols-12 gap-4 p-4">
      {/* Left rail */}
      <Box component="aside" className="col-span-3 space-y-3">
        <Card className="rounded-2xl">
          <CardHeader
            title={
              <Typography variant="h6" className="flex items-center gap-2">
                <Group className="h-4 w-4" />
                Agents
              </Typography>
            }
          />
          <CardContent className="space-y-2">
            {agents.map((a) => (
              <Box
                key={a.id}
                className="flex items-center justify-between p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
              >
                <Box>
                  <Typography variant="subtitle1" className="font-medium">
                    {a.name}
                  </Typography>
                  <Typography variant="caption" className="text-xs opacity-70">
                    {a.tags.join(' • ')}
                  </Typography>
                </Box>
                <Box className="flex gap-2">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setOpenChat(true)}
                    startIcon={<Message />}
                  >
                    Chat
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<Phone />}>
                    Call
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Videocam />}
                  >
                    Video
                  </Button>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
        <Button
          variant="contained"
          className="w-full"
          onClick={() => setCmdOpen(true)}
          startIcon={<RocketLaunch />}
        >
          Open Command Palette (⌘K)
        </Button>
      </Box>

      {/* Center tiles */}
      <Box component="main" className="col-span-6 space-y-3">
        <Box className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="rounded-2xl">
                <CardHeader
                  title={
                    <Typography
                      variant="h6"
                      className="flex items-center gap-2"
                    >
                      <Activity className="h-4 w-4" />
                      {t.title}
                    </Typography>
                  }
                />
                <CardContent>
                  <Typography variant="h4" className="font-bold">
                    {t.metric}
                  </Typography>
                  <Typography variant="body2" className="opacity-70">
                    {t.desc}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
        <Card className="rounded-2xl">
          <CardHeader
            title={<Typography variant="h6">Meeting Stage</Typography>}
          />
          <CardContent>
            {meeting ? (
              <Box className="h-48 rounded-xl bg-black/80 text-white flex items-center justify-center">
                <Typography variant="h6">Live WebRTC Stage</Typography>
              </Box>
            ) : (
              <Button variant="contained" onClick={() => setMeeting(true)}>
                Start Local Meeting
              </Button>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Right rail: Co‑pilot */}
      <Box component="aside" className="col-span-3 space-y-3">
        <Card className="rounded-2xl">
          <CardHeader
            title={
              <Typography variant="h6" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Co‑pilot
              </Typography>
            }
          />
          <CardContent className="space-y-3">
            <Box className="flex gap-2">
              <Button variant="outlined" startIcon={<Mic />}>
                Listen
              </Button>
              <Button variant="outlined">Present</Button>
            </Box>
            <Typography variant="caption" className="opacity-70">
              Context loaded: org, agenda, metrics. Actions will be
              policy‑checked.
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Chat dialog */}
      <Dialog
        open={openChat}
        onClose={() => setOpenChat(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chat with Agent</DialogTitle>
        <DialogContent>
          <Box className="rounded-xl border p-3 min-h-32 bg-gray-50 dark:bg-gray-900">
            <Typography> (messages…) </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Command Palette */}
      <Dialog
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent className="p-0">
          <TextField
            fullWidth
            placeholder="/call maestro | /present deck | /join room | /status api"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            className="p-4"
          />
          <List>
            {filteredCommands.map((cmd, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => handleCommandSelect(cmd)}>
                  <Typography>{cmd}</Typography>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
