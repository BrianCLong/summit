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
} from '@mui/material';
import { Lightbulb, Mic } from '@mui/icons-material';
import AgentCard from './AgentCard';
import SystemStatusCard from './SystemStatusCard';
import ActionsPanel from './ActionsPanel';
import CommandPalette from './CommandPalette';
import { agents, systemStatus } from './mockData';

export default function Switchboard() {
  const [openChat, setOpenChat] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [meeting, setMeeting] = useState(false);

  const handleCommandSelect = (command: string) => {
    if (command.includes('meeting')) {
      setMeeting(true);
    } else if (command.includes('Scribe')) {
      setOpenChat(true);
    }
    setCmdOpen(false);
  };

  return (
    <Box className="grid grid-cols-12 gap-4 p-4">
      {/* Left rail */}
      <Box component="aside" className="col-span-3 space-y-3">
        <AgentCard agents={agents} onChat={() => setOpenChat(true)} />
        <ActionsPanel onOpenCommandPalette={() => setCmdOpen(true)} />
      </Box>

      {/* Center tiles */}
      <Box component="main" className="col-span-6 space-y-3">
        <Box className="grid grid-cols-2 gap-3">
          {systemStatus.map((s) => (
            <SystemStatusCard key={s.id} status={s} />
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
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onCommandSelect={handleCommandSelect}
      />
    </Box>
  );
}
