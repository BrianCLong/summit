"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Switchboard;
const react_1 = require("react");
const command_1 = require("@/components/ui/command");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const dialog_1 = require("@/components/ui/dialog");
const lucide_react_1 = require("lucide-react");
const framer_motion_1 = require("framer-motion");
const i18n_1 = require("../i18n");
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
const approvals = [
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
const timeline = [
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
const graphSlice = [
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
function Switchboard() {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [cmdOpen, setCmdOpen] = (0, react_1.useState)(false);
    const [meeting, setMeeting] = (0, react_1.useState)(false);
    return (<div className="grid grid-cols-12 gap-4 p-4">
      {/* Left rail */}
      <div role="complementary" className="col-span-3 space-y-3">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.Users className="h-4 w-4"/>
              {(0, i18n_1.t)('agentsTitle')}
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-2">
            {agents.map((a) => (<div key={a.id} className="flex items-center justify-between rounded-xl bg-muted p-2">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs opacity-70">{a.tags.join(' • ')}</p>
                </div>
                <div className="flex gap-2">
                  <button_1.Button size="sm" variant="secondary" onClick={() => setOpen(true)} aria-label={(0, i18n_1.t)('messageAgent', { agentName: a.name })} title={(0, i18n_1.t)('messageAgent', { agentName: a.name })}>
                    <lucide_react_1.MessageSquare className="h-4 w-4"/>
                  </button_1.Button>
                  <button_1.Button size="sm" variant="secondary" aria-label={(0, i18n_1.t)('callAgent', { agentName: a.name })} title={(0, i18n_1.t)('callAgent', { agentName: a.name })}>
                    <lucide_react_1.PhoneCall className="h-4 w-4"/>
                  </button_1.Button>
                  <button_1.Button size="sm" variant="secondary" aria-label={(0, i18n_1.t)('videoCallAgent', { agentName: a.name })} title={(0, i18n_1.t)('videoCallAgent', { agentName: a.name })}>
                    <lucide_react_1.Video className="h-4 w-4"/>
                  </button_1.Button>
                </div>
              </div>))}
          </card_1.CardContent>
        </card_1.Card>
        <button_1.Button className="w-full" onClick={() => setCmdOpen(true)}>
          <lucide_react_1.Rocket className="mr-2 h-4 w-4"/>
          {(0, i18n_1.t)('openCommandPalette')}
        </button_1.Button>
      </div>

      {/* Center tiles */}
      <main className="col-span-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (<framer_motion_1.motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <card_1.Card className="rounded-2xl">
                <card_1.CardHeader>
                  <card_1.CardTitle className="flex items-center gap-2">
                    <lucide_react_1.Activity className="h-4 w-4"/>
                    {t.title}
                  </card_1.CardTitle>
                </card_1.CardHeader>
                <card_1.CardContent>
                  <div className="text-3xl font-bold">{t.metric}</div>
                  <div className="text-sm opacity-70">{t.desc}</div>
                </card_1.CardContent>
              </card_1.Card>
            </framer_motion_1.motion.div>))}
        </div>
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>{(0, i18n_1.t)('meetingStageTitle')}</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            {meeting ? (<div className="flex h-48 items-center justify-center rounded-xl bg-black/80 text-white">
                {(0, i18n_1.t)('liveWebrtcStage')}
              </div>) : (<button_1.Button onClick={() => setMeeting(true)}>{(0, i18n_1.t)('startLocalMeeting')}</button_1.Button>)}
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>{(0, i18n_1.t)('approvalsInboxTitle')}</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-3">
            {approvals.map((item) => (<div key={item.id} className="flex items-start justify-between rounded-xl border p-3">
                <div>
                  <p className="font-semibold">{item.change}</p>
                  <p className="text-sm opacity-80">
                    {item.requester} → {item.system}
                  </p>
                  <p className="text-xs opacity-70">
                    {(0, i18n_1.t)('policyLabel', { policy: item.policy })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'approved'
                ? 'bg-green-100 text-green-800'
                : item.status === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'}`}>
                    {item.status}
                  </span>
                  <button_1.Button size="sm" variant="secondary">
                    {(0, i18n_1.t)('reviewAction')}
                  </button_1.Button>
                </div>
              </div>))}
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>{(0, i18n_1.t)('timelineTitle')}</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-2">
            {timeline.map((entry) => (<div key={entry.id} className="flex items-start justify-between rounded-xl bg-muted/60 p-3">
                <div>
                  <p className="font-semibold">{entry.action}</p>
                  <p className="text-sm opacity-80">{entry.target}</p>
                  <p className="text-xs opacity-70">{entry.actor}</p>
                </div>
                <span className="text-xs opacity-70">{entry.ts}</span>
              </div>))}
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>{(0, i18n_1.t)('graphSliceTitle')}</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="grid grid-cols-2 gap-2">
            {graphSlice.map((row) => (<div key={`${row.person}-${row.system}`} className="rounded-xl border p-3 text-sm">
                <p className="font-semibold">{row.person}</p>
                <p className="opacity-80">{(0, i18n_1.t)('roleLabel', { role: row.role })}</p>
                <p className="opacity-80">{(0, i18n_1.t)('systemLabel', { system: row.system })}</p>
                <p className="opacity-70">
                  {(0, i18n_1.t)('approvedLabel', { change: row.approvedChange })}
                </p>
              </div>))}
          </card_1.CardContent>
        </card_1.Card>
      </main>

      {/* Right rail: Co-pilot */}
      <div role="complementary" className="col-span-3 space-y-3">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.Brain className="h-4 w-4"/>
              {(0, i18n_1.t)('copilotTitle')}
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-3">
            <div className="flex gap-2">
              <button_1.Button variant="secondary">
                <lucide_react_1.Mic className="mr-2 h-4 w-4"/>
                {(0, i18n_1.t)('listenAction')}
              </button_1.Button>
              <button_1.Button variant="secondary">{(0, i18n_1.t)('presentAction')}</button_1.Button>
            </div>
            <div className="text-xs opacity-70">
              {(0, i18n_1.t)('copilotContext')}
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Chat dialog */}
      <dialog_1.Dialog open={open} onOpenChange={setOpen}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>{(0, i18n_1.t)('chatWithAgentTitle')}</dialog_1.DialogTitle>
          </dialog_1.DialogHeader>
          <div className="min-h-32 rounded-xl border p-3">
            {(0, i18n_1.t)('messagesPlaceholder')}
          </div>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* Command Palette */}
      {cmdOpen && (<div className="fixed inset-0 flex items-start justify-center bg-black/40 p-10" onClick={() => setCmdOpen(false)}>
          <div className="w-full max-w-xl" onClick={(event) => event.stopPropagation()}>
            <command_1.Command>
              <command_1.CommandInput placeholder={(0, i18n_1.t)('commandPlaceholder')}/>
              <command_1.CommandList>
                <command_1.CommandItem onSelect={() => setMeeting(true)}>
                  {(0, i18n_1.t)('startMeetingCommand')}
                </command_1.CommandItem>
                <command_1.CommandItem onSelect={() => setOpen(true)}>
                  {(0, i18n_1.t)('messageScribeCommand')}
                </command_1.CommandItem>
                <command_1.CommandItem>{(0, i18n_1.t)('openGraphViewCommand')}</command_1.CommandItem>
              </command_1.CommandList>
            </command_1.Command>
          </div>
        </div>)}
    </div>);
}
