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

type Approval = {
  id: string;
  requester: string;
  change: string;
  system: string;
  status: 'pending' | 'approved' | 'denied';
  policy: string;
};

type TimelineEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  ts: string;
};

type GraphSlice = {
  person: string;
  role: string;
  system: string;
  approvedChange: string;
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

const approvals: Approval[] = [
  {
    id: 'ap-01',
    requester: 'A. Rivera',
    change: 'Rollout feature flag: risk-guard',
    system: 'Switchboard API',
    status: 'pending',
    policy: 'opa.high-risk.mfa + vp-signoff',
  },
  {
    id: 'ap-02',
    requester: 'J. Chen',
    change: 'Rotate webhook secret',
    system: 'Event Bus',
    status: 'approved',
    policy: 'security-approver',
  },
];

const timeline: TimelineEntry[] = [
  {
    id: 'tl-01',
    actor: 'Security Bot',
    action: 'OPA decision',
    target: 'risk-guard rollout → allow-with-mfa',
    ts: '08:13',
  },
  {
    id: 'tl-02',
    actor: 'V. Patel',
    action: 'Approved',
    target: 'Webhook secret rotation',
    ts: '08:02',
  },
  {
    id: 'tl-03',
    actor: 'Runbook',
    action: 'Receipt emitted',
    target: 'Change CH-4421',
    ts: '07:59',
  },
];

const graphSlice: GraphSlice[] = [
  {
    person: 'A. Rivera',
    role: 'Security Approver',
    system: 'Switchboard API',
    approvedChange: 'Rollout feature flag: risk-guard',
  },
  {
    person: 'J. Chen',
    role: 'VP Engineering',
    system: 'Event Bus',
    approvedChange: 'Rotate webhook secret',
  },
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

        <Card>
          <CardHeader>
            <CardTitle>Approvals Inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvals.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between rounded-xl border p-3"
              >
                <div>
                  <p className="font-semibold">{item.change}</p>
                  <p className="text-sm opacity-80">
                    {item.requester} → {item.system}
                  </p>
                  <p className="text-xs opacity-70">Policy: {item.policy}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.status}
                  </span>
                  <Button size="sm" variant="secondary">
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {timeline.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between rounded-xl bg-muted/60 p-3"
              >
                <div>
                  <p className="font-semibold">{entry.action}</p>
                  <p className="text-sm opacity-80">{entry.target}</p>
                  <p className="text-xs opacity-70">{entry.actor}</p>
                </div>
                <span className="text-xs opacity-70">{entry.ts}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Graph Slice: Who approved what?</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {graphSlice.map((row) => (
              <div
                key={`${row.person}-${row.system}`}
                className="rounded-xl border p-3 text-sm"
              >
                <p className="font-semibold">{row.person}</p>
                <p className="opacity-80">Role: {row.role}</p>
                <p className="opacity-80">System: {row.system}</p>
                <p className="opacity-70">Approved: {row.approvedChange}</p>
              </div>
            ))}
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
