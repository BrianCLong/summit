import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, CircleOff, History, KeyRound, MessageSquare, ShieldAlert, ShieldCheck, UploadCloud, Settings2, Database, Lock } from "lucide-react";

/**
 * Agent Workbench UI — Lightweight, MC‑aligned operator+dev surface
 *
 * Design goals
 * - Persisted‑only: every request must reference a persisted query id (PQID) or is blocked
 * - Audit‑logged: all actions emit audit events (client shows what is sent; server must persist)
 * - Multi‑model: user selects a route (e.g., gpt‑4.1, claude‑op, llama‑X) — server decides final routing
 * - Policy‑aware: purpose/residency/tenant context sent on every call; policy decision preview shown
 * - Read‑only defaults: generation & analysis only; write actions require explicit enable + HITL
 *
 * Backend expectations (implement separately):
 * POST /api/workbench/chat { tenantId, purpose, residency, model, pqid, input }
 *  → { messages:[{role,content,at}], usage:{tokensIn,tokensOut}, persisted:true, policy:{allow:boolean, reasons:string[]} }
 * GET  /api/workbench/pq?tenantId=... → { items:[{id:string, name:string, operation:string}] }
 * POST /api/policy/simulate { tenantId, purpose, residency, pqid } → { allow:boolean, reasons:string[] }
 * POST /api/audit/log { event, subject, tenantId, extra } → { ok:true }
 */

export default function AgentWorkbench() {
  // Context & policy inputs
  const [tenantId, setTenantId] = useState("TENANT_001");
  const [purpose, setPurpose] = useState("investigation");
  const [residency, setResidency] = useState("US");

  // Model routing & PQ enforcement
  const [model, setModel] = useState("gpt-4.1");
  const [pqid, setPqid] = useState<string | null>(null);
  const [pqItems, setPqItems] = useState<{ id: string; name: string; operation: string }[]>([]);
  const [persistedOnly, setPersistedOnly] = useState(true);

  // Chat state
  type Msg = { role: "user" | "assistant" | "system"; content: string; at: string };
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Policy preview
  const [policy, setPolicy] = useState<{ allow: boolean; reasons: string[] } | null>(null);

  // Audit trail (UI reflection; server must persist real audit)
  type Audit = { ts: string; event: string; detail: string };
  const [audit, setAudit] = useState<Audit[]>([]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  // Load PQ list on tenant change
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/workbench/pq?tenantId=${encodeURIComponent(tenantId)}`);
        const data = await res.json();
        setPqItems(data.items || []);
        if (data.items?.length) setPqid(data.items[0].id);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [tenantId]);

  // Policy simulation when inputs change
  useEffect(() => {
    (async () => {
      if (!pqid) return setPolicy(null);
      try {
        const res = await fetch("/api/policy/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId, purpose, residency, pqid }),
        });
        const data = await res.json();
        setPolicy({ allow: !!data.allow, reasons: data.reasons || [] });
      } catch (e) {
        setPolicy({ allow: false, reasons: ["policy simulation failed"] });
      }
    })();
  }, [tenantId, purpose, residency, pqid]);

  const appendAudit = (event: string, detail: string) => {
    const entry = { ts: new Date().toISOString(), event, detail };
    setAudit((a) => [entry, ...a]);
    // Fire-and-forget server audit (non-blocking)
    fetch("/api/audit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, subject: "agent.workbench", tenantId, extra: entry }),
    }).catch(() => void 0);
  };

  const canSend = useMemo(() => {
    if (persistedOnly && !pqid) return false;
    if (policy && !policy.allow) return false;
    return input.trim().length > 0 && !busy;
  }, [persistedOnly, pqid, policy, input, busy]);

  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    const userMsg: Msg = { role: "user", content: input.trim(), at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    appendAudit("chat.send.request", `pqid=${pqid ?? "NONE"}; model=${model}; purpose=${purpose}; residency=${residency}`);

    try {
      const res = await fetch("/api/workbench/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, purpose, residency, model, pqid, input: userMsg.content }),
      });
      const data = await res.json();

      if (!data?.persisted && persistedOnly) {
        appendAudit("chat.blocked", "Server indicates non‑persisted op; blocked by client policy");
        setBusy(false);
        return;
      }

      if (data?.policy && data.policy.allow === false) {
        appendAudit("chat.blocked", `OPA deny: ${data.policy.reasons?.join("; ") ?? "no reasons"}`);
        setBusy(false);
        return;
      }

      const reply: Msg = { role: "assistant", content: data?.messages?.[data.messages.length - 1]?.content ?? "(no content)", at: new Date().toISOString() };
      setMessages((m) => [...m, reply]);
      appendAudit("chat.send.success", `tokensIn=${data?.usage?.tokensIn ?? 0}; tokensOut=${data?.usage?.tokensOut ?? 0}`);
    } catch (e: any) {
      appendAudit("chat.error", e?.message ?? "unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-slate-50 p-6">
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4">
          {/* Left: Controls & Policy */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-xl">Session Context</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Tenant</label>
                    <Input value={tenantId} onChange={(e)=>setTenantId(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Residency</label>
                    <Select value={residency} onValueChange={setResidency}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Region" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">US</SelectItem>
                        <SelectItem value="EU">EU</SelectItem>
                        <SelectItem value="CA">CA</SelectItem>
                        <SelectItem value="OTHER">OTHER</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Purpose</label>
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Purpose" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="investigation">investigation</SelectItem>
                        <SelectItem value="threat_intel">threat_intel</SelectItem>
                        <SelectItem value="fraud_risk">fraud_risk</SelectItem>
                        <SelectItem value="t_s">t_s</SelectItem>
                        <SelectItem value="benchmarking">benchmarking</SelectItem>
                        <SelectItem value="training">training</SelectItem>
                        <SelectItem value="demo">demo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Model Route</label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Model" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4.1">gpt-4.1</SelectItem>
                        <SelectItem value="claude-opus">claude-opus</SelectItem>
                        <SelectItem value="llama-x">llama-x</SelectItem>
                        <SelectItem value="mixed-router">mixed-router</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4"/>
                    <div>
                      <div className="text-sm font-medium">Persisted‑only</div>
                      <div className="text-xs text-slate-500">Block any request without a PQID</div>
                    </div>
                  </div>
                  <Switch checked={persistedOnly} onCheckedChange={setPersistedOnly} />
                </div>

                <div>
                  <label className="text-xs text-slate-500">Persisted Query</label>
                  <Select value={pqid ?? undefined} onValueChange={(v)=>setPqid(v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select a persisted query" /></SelectTrigger>
                    <SelectContent>
                      {pqItems.map((pq)=> (
                        <SelectItem key={pq.id} value={pq.id}>{pq.name} ({pq.operation})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {policy?.allow ? <ShieldCheck className="h-4 w-4"/> : <ShieldAlert className="h-4 w-4"/>}
                    <div className="text-sm font-medium">Policy Simulation</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={policy?.allow ? "default" : "destructive"}>
                      {policy?.allow ? "ALLOW" : "DENY"}
                    </Badge>
                    <div className="text-xs text-slate-600">{policy?.reasons?.join(" • ") || "Run-time simulation attached"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Badge className="justify-start gap-1" variant="outline"><Database className="h-3 w-3"/> Tenant</Badge>
                  <Badge className="justify-start gap-1" variant="outline"><KeyRound className="h-3 w-3"/> Purpose</Badge>
                  <Badge className="justify-start gap-1" variant="outline"><Settings2 className="h-3 w-3"/> Model</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-xl">Audit Trail</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-56 pr-2">
                  <div className="space-y-3">
                    {audit.map((a, i)=> (
                      <div key={i} className="rounded-lg border p-2 text-xs">
                        <div className="font-mono text-[10px] text-slate-500">{a.ts}</div>
                        <div className="font-medium">{a.event}</div>
                        <div className="text-slate-600 whitespace-pre-wrap">{a.detail}</div>
                      </div>
                    ))}
                    {audit.length===0 && <div className="text-xs text-slate-500">No audit events yet.</div>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right: Chat & Results */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-xl">Agent Chat (governed)</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-xl border p-3 bg-white">
                  <ScrollArea className="h-[48vh] pr-4">
                    <div className="space-y-4">
                      {messages.map((m, idx)=> (
                        <div key={idx} className={`rounded-lg p-3 ${m.role==='assistant' ? 'bg-slate-50' : 'bg-white border'}`}>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {m.role==='assistant' ? <CheckCircle2 className="h-3 w-3"/> : <MessageSquare className="h-3 w-3"/>}
                            <span className="uppercase">{m.role}</span>
                            <span className="font-mono">{new Date(m.at).toLocaleTimeString()}</span>
                          </div>
                          <div className="mt-1 whitespace-pre-wrap text-sm">{m.content}</div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="mt-3 grid grid-cols-12 gap-2">
                    <div className="col-span-10">
                      <Textarea
                        placeholder={persistedOnly ? "Type message (requires PQID)" : "Type message"}
                        value={input}
                        onChange={(e)=>setInput(e.target.value)}
                        className="min-h-[44px]"
                        onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                      />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="w-full">
                            <Button onClick={send} disabled={!canSend} className="w-full">
                              Send
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {!pqid && persistedOnly ? <span>Blocked: select a Persisted Query</span> : !policy?.allow ? <span>Blocked by policy</span> : busy ? <span>Working…</span> : <span>Send governed request</span> }
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Request Details</TabsTrigger>
                <TabsTrigger value="pq">Persisted Queries</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <Card className="shadow-sm">
                  <CardContent className="p-4 text-xs text-slate-700">
                    <div className="grid grid-cols-2 gap-3">
                      <div><span className="font-semibold">Model:</span> {model}</div>
                      <div><span className="font-semibold">Tenant:</span> {tenantId}</div>
                      <div><span className="font-semibold">Purpose:</span> {purpose}</div>
                      <div><span className="font-semibold">Residency:</span> {residency}</div>
                      <div className="col-span-2"><span className="font-semibold">PQID:</span> {pqid ?? <span className="inline-flex items-center gap-1 text-amber-700"><CircleOff className="h-3 w-3"/>none</span>}</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="pq">
                <Card className="shadow-sm">
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left bg-slate-100">
                          <th className="p-2">Name</th>
                          <th className="p-2">Operation</th>
                          <th className="p-2">ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pqItems.map((pq)=> (
                          <tr key={pq.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={()=>setPqid(pq.id)}>
                            <td className="p-2">{pq.name}</td>
                            <td className="p-2">{pq.operation}</td>
                            <td className="p-2 font-mono text-xs">{pq.id}</td>
                          </tr>
                        ))}
                        {pqItems.length===0 && (
                          <tr><td className="p-4 text-xs text-slate-500" colSpan={3}>No persisted queries available for this tenant.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
