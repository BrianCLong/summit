'use client';
import { useState } from 'react';
import { Mic, PhoneCall, Video, MessageSquare, Rocket, Activity, Users, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [open, setOpen] = useState(false);
  const [meeting, setMeeting] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="grid grid-cols-12 gap-4">
      <aside className="col-span-3 space-y-3">
        <div className="rounded-2xl border p-3">
          <div className="font-semibold flex items-center gap-2 mb-2"><Users className="h-4 w-4"/>Agents</div>
          <div className="space-y-2">
            {agents.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs opacity-70">{a.tags.join(' • ')}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 text-sm rounded bg-white/70 dark:bg-black/30 border" onClick={()=>setOpen(true)}><MessageSquare className="h-4 w-4"/></button>
                  <button className="px-2 py-1 text-sm rounded bg-white/70 dark:bg-black/30 border"><PhoneCall className="h-4 w-4"/></button>
                  <button className="px-2 py-1 text-sm rounded bg-white/70 dark:bg-black/30 border"><Video className="h-4 w-4"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="w-full px-3 py-2 rounded-xl border" onClick={()=>setCmdOpen(true)}><Rocket className="h-4 w-4 inline mr-2"/>Open Command Palette (⌘K)</button>
      </aside>

      <main className="col-span-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map(t => (
            <motion.div key={t.id} initial={{opacity:0, y:8}} animate={{opacity:1,y:0}}>
              <div className="rounded-2xl border p-3">
                <div className="font-semibold flex items-center gap-2 mb-1"><Activity className="h-4 w-4"/>{t.title}</div>
                <div className="text-3xl font-bold">{t.metric}</div>
                <div className="text-sm opacity-70">{t.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="rounded-2xl border p-3">
          <div className="font-semibold mb-2">Meeting Stage</div>
          {meeting ? (
            <div className="h-48 rounded-xl bg-black/80 text-white flex items-center justify-center">Live WebRTC Stage</div>
          ) : (
            <button className="px-3 py-2 rounded-xl border" onClick={()=>setMeeting(true)}>Start Local Meeting</button>
          )}
        </div>
      </main>

      <aside className="col-span-3 space-y-3">
        <div className="rounded-2xl border p-3">
          <div className="font-semibold flex items-center gap-2 mb-2"><Brain className="h-4 w-4"/>Co‑pilot</div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-xl border"><Mic className="h-4 w-4 inline mr-2"/>Listen</button>
            <button className="px-3 py-2 rounded-xl border">Present</button>
          </div>
          <div className="text-xs opacity-70 mt-2">Context loaded: org, agenda, metrics. Actions will be policy‑checked.</div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center" onClick={()=>setOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="font-semibold mb-2">Chat with Agent</div>
            <div className="rounded-xl border p-3 min-h-32">(messages…)</div>
          </div>
        </div>
      )}

      {cmdOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-10" onClick={()=>setCmdOpen(false)}>
          <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl p-4 border" onClick={e=>e.stopPropagation()}>
            <input autoFocus placeholder="/call maestro | /present deck | /join room | /status api" className="w-full p-3 rounded-xl border bg-transparent"/>
            <div className="mt-3 text-sm opacity-70">Try: Start meeting • Message Scribe • Open Graph View</div>
          </div>
        </div>
      )}
    </div>
  );
}
