import { useState } from 'react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
} from '@/components/ui/command';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mic,
  PhoneCall,
  Video,
  MessageSquare,
  Rocket,
  Activity,
  Users,
  Brain,
} from 'lucide-react';
import { motion } from 'framer-motion';

type Agent = {
  id: string;
  name: string;
  tags: string[];
};

type Tile = {
  id: string;
  title: string;
  metric: string;
  desc: string;
};

const agents: Agent[] = [
  { id: 'maestro', name: 'Maestro Conductor', tags: ['router', 'exec'] },
  { id: 'codex', name: 'CodeGen Codex', tags: ['dev', 'test'] },
  { id: 'sentinel', name: 'Sentinel CI', tags: ['sec', 'policy'] },
  { id: 'scribe', name: 'Scribe', tags: ['notes', 'transcribe'] },
];

const tiles: Tile[] = [
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
  const [open, setOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [meeting, setMeeting] = useState(false);

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      {/* Left rail */}
      <aside className="col-span-3 space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl bg-muted p-2"
              >
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs opacity-70">{a.tags.join(' • ')}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary">
                    <PhoneCall className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Button className="w-full" onClick={() => setCmdOpen(true)}>
          <Rocket className="mr-2 h-4 w-4" />
          Open Command Palette (⌘K)
        </Button>
      </aside>

      {/* Center tiles */}
      <main className="col-span-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{t.metric}</div>
                  <div className="text-sm opacity-70">{t.desc}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Meeting Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {meeting ? (
              <div className="flex h-48 items-center justify-center rounded-xl bg-black/80 text-white">
                Live WebRTC Stage
              </div>
            ) : (
              <Button onClick={() => setMeeting(true)}>
                Start Local Meeting
              </Button>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Right rail: Co-pilot */}
      <aside className="col-span-3 space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Co-pilot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button variant="secondary">
                <Mic className="mr-2 h-4 w-4" />
                Listen
              </Button>
              <Button variant="secondary">Present</Button>
            </div>
            <div className="text-xs opacity-70">
              Context loaded: org, agenda, metrics. Actions will be
              policy-checked.
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Chat dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat with Agent</DialogTitle>
          </DialogHeader>
          <div className="min-h-32 rounded-xl border p-3">(messages…)</div>
        </DialogContent>
      </Dialog>

      {/* Command Palette */}
      {cmdOpen && (
        <div
          className="fixed inset-0 flex items-start justify-center bg-black/40 p-10"
          onClick={() => setCmdOpen(false)}
        >
          <div
            className="w-full max-w-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Command>
              <CommandInput placeholder="/call maestro | /present deck | /join room | /status api" />
              <CommandList>
                <CommandItem onSelect={() => setMeeting(true)}>
                  Start meeting
                </CommandItem>
                <CommandItem onSelect={() => setOpen(true)}>
                  Message Scribe
                </CommandItem>
                <CommandItem>Open Graph View</CommandItem>
              </CommandList>
            </Command>
          </div>
        </div>
      )}
    </div>
  );
}
