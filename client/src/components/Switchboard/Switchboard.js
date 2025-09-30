'use client';
import { useState } from 'react';
import {
  Box, Card, CardHeader, CardContent, Typography,
  Button, Dialog, DialogContent, DialogTitle,
  TextField, InputAdornment, List, ListItem, ListItemButton, Snackbar, Alert
} from '@mui/material';
import {
  Group, Message, Phone, Videocam, RocketLaunch,
  Insights, Lightbulb, Mic, Settings, Search
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import useHotkey from '../../hooks/useHotkey'; // Added import

const agents = [
  { id: 'maestro', name: 'Maestro Conductor', tags: ['router','exec'] },
  { id: 'codex', name: 'CodeGen Codex', tags: ['dev','test'] },
  { id: 'sentinel', name: 'Sentinel CI', tags: ['sec','policy'] },
  { id: 'scribe', name: 'Scribe', tags: ['notes','transcribe'] },
];

const tiles = [
  { id: 'status', title: 'System Status', metric: 'OK', desc: 'All lanes green' },
  { id: 'incidents', title: 'Incidents', metric: '0', desc: 'No active' },
  { id: 'deploys', title: 'Deploys', metric: '3', desc: 'prod canary live' },
  { id: 'cost', title: 'LLM Spend', metric: '$42', desc: '24h window' },
];

export default function Switchboard(){
  const [openChat, setOpenChat] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [meeting, setMeeting] = useState(false);
  const [meetingStage, setMeetingStage] = useState('idle'); // idle | connecting | live // Added
  const [toast, setToast] = useState({ open: false, msg: '', sev: 'info' }); // Added
  const [commandInput, setCommandInput] = useState('');

  useHotkey('mod+k', () => setCmdOpen(true)); // Added useHotkey call

  const handleCommandSelect = (command) => {
    if (command.toLowerCase().includes('meeting')) setMeeting(true);
    else if (command.toLowerCase().includes('scribe')) setOpenChat(true);
    setCmdOpen(false);
    setCommandInput('');
  };

  // Added meeting handlers
  const startMeeting = () => {
    setMeeting(true);
    setMeetingStage('connecting');
    setToast({ open: true, msg: 'Connecting to local stage…', sev: 'info' });
    // fake connect, then go live
    setTimeout(() => {
      setMeetingStage('live');
      setToast({ open: true, msg: 'You are live (local)', sev: 'success' });
    }, 1200);
  };

  const endMeeting = () => {
    setMeeting(false);
    setMeetingStage('idle');
    setToast({ open: true, msg: 'Meeting ended', sev: 'info' });
  };

  const filteredCommands = [
    'Start meeting',
    'Message Scribe',
    'Open Graph View',
    '/call maestro',
    '/present deck',
    '/join room',
    '/status api',
  ].filter(cmd => cmd.toLowerCase().includes(commandInput.toLowerCase()));

  return (
    <Box className="grid grid-cols-12 gap-4 p-4">
      {/* Left rail */}
      <Box component="aside" className="col-span-3 space-y-3">
        <Card className="rounded-2xl">
          <CardHeader
            title={
              <Typography variant="h6" className="flex items-center gap-2">
                <Group fontSize="small" />
                Agents
              </Typography>
            }
          />
          <CardContent className="space-y-2">
            {agents.map(a => (
              <Box key={a.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                <Box>
                  <Typography variant="subtitle1" className="font-medium">{a.name}</Typography>
                  <Typography variant="caption" className="text-xs opacity-70">{a.tags.join(' • ')}</Typography>
                </Box>
                <Box className="flex gap-2">
                  <Button size="small" variant="outlined" onClick={()=>setOpenChat(true)} startIcon={<Message />}>Chat</Button>
                  <Button size="small" variant="outlined" startIcon={<Phone />}>Call</Button>
                  <Button size="small" variant="outlined" startIcon={<Videocam />}>Video</Button>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
        <Button variant="contained" className="w-full" onClick={()=>setCmdOpen(true)} startIcon={<RocketLaunch />}>
          Open Command Palette (⌘K)
        </Button>
      </Box>

      {/* Center tiles */}
      <Box component="main" className="col-span-6 space-y-3">
        <Box className="grid grid-cols-2 gap-3">
          {tiles.map(t => (
            <motion.div key={t.id} initial={{opacity:0, y:8}} animate={{opacity:1,y:0}}>
              <Card className="rounded-2xl">
                <CardHeader
                  title={
                    <Typography variant="h6" className="flex items-center gap-2">
                      <Insights fontSize="small" />
                      {t.title}
                    </Typography>
                  }
                />
                <CardContent>
                  <Typography variant="h4" className="font-bold">{t.metric}</Typography>
                  <Typography variant="body2" className="opacity-70">{t.desc}</Typography>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
        <Card className="rounded-2xl">
          <CardHeader title={<Typography variant="h6">Meeting Stage</Typography>} />
          <CardContent>
            {meeting ? (
              <Box className="h-48 rounded-xl bg-black/80 text-white flex items-center justify-center flex-col gap-2">
                <Typography variant="h6">
                  {meetingStage === 'connecting' ? 'Connecting…' : 'Live WebRTC Stage (stub)'}
                </Typography>
                {meetingStage === 'live' && (
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Bitrate ~2.1 Mbps • Latency ~28 ms (simulated)
                  </Typography>
                )}
                <Box className="mt-2">
                  <Button size="small" variant="outlined" onClick={endMeeting}>End Meeting</Button>
                </Box>
              </Box>
            ) : (
              <Button variant="contained" onClick={startMeeting}>Start Local Meeting</Button>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Right rail */}
      <Box component="aside" className="col-span-3 space-y-3">
        <Card className="rounded-2xl">
          <CardHeader
            title={
              <Typography variant="h6" className="flex items-center gap-2">
                <Lightbulb fontSize="small" />
                Co-pilot
              </Typography>
            }
          />
          <CardContent className="space-y-3">
            <Box className="flex gap-2">
              <Button variant="outlined" startIcon={<Mic />}>Listen</Button>
              <Button variant="outlined">Present</Button>
            </Box>
            <Typography variant="caption" className="opacity-70">
              Context loaded: org, agenda, metrics. Actions will be policy-checked.
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Chat dialog */}
      <Dialog open={openChat} onClose={()=>setOpenChat(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chat with Agent</DialogTitle>
        <DialogContent>
          <Box className="rounded-xl border p-3 min-h-32 bg-gray-50 dark:bg-gray-900">
            <Typography>(messages…)</Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Command palette */}
      <Dialog open={cmdOpen} onClose={()=>setCmdOpen(false)} maxWidth="md" fullWidth>
        <DialogContent className="p-0">
          <TextField
            fullWidth
            placeholder="/call maestro | /present deck | /join room | /status api"
            value={commandInput}
            onChange={e=>setCommandInput(e.target.value)}
            onKeyDown={(e) => { // Added onKeyDown
              if (e.key === 'Enter' && filteredCommands[0]) {
                handleCommandSelect(filteredCommands[0]);
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
            className="p-4"
          />
          <List>
            {filteredCommands.map((cmd, idx) => (
              <ListItem key={idx} disablePadding>
                <ListItemButton onClick={()=>handleCommandSelect(cmd)}>
                  <Typography>{cmd}</Typography>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar // Added Snackbar
        open={toast.open}
        autoHideDuration={2200}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.sev} onClose={() => setToast(t => ({ ...t, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
