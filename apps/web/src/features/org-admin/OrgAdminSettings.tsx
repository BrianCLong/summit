// =============================================
// Summit Administrative Command Center
// =============================================
import React, { useState } from 'react'
import {
  Users,
  Key,
  CreditCard,
  ShieldAlert,
  ClipboardList,
  Search,
  Plus,
  ArrowUpRight,
  Fingerprint,
  Database,
  Lock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const NAVIGATION = [
  { id: 'users', label: 'Operator Registry', icon: Users },
  { id: 'auth', label: 'Access Control // SSO', icon: Key },
  { id: 'billing', label: 'Fiscal Allocation', icon: CreditCard },
  { id: 'security', label: 'Sovereign Integrity', icon: ShieldAlert },
  { id: 'audit', label: 'System Ledger', icon: ClipboardList },
]

export default function OrgAdminSettings() {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Left rail: Admin Nav */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border bg-background/50">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">ADMIN_COMMAND</h2>
        </div>
        <div className="flex-1 p-3 space-y-1">
          {NAVIGATION.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all border border-transparent",
                activeTab === item.id
                  ? "bg-accent text-accent-foreground border-border/50 shadow-inner"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 bg-muted/20 border-t border-border mt-auto">
          <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            <Lock className="h-3 w-3" />
            <span>SESSION_ENCRYPTED</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/30">
        <header className="h-16 border-b border-border bg-background/50 flex items-center px-8 justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-xl font-bold uppercase tracking-widest">{NAVIGATION.find(n => n.id === activeTab)?.label}</h1>
            <span className="text-[10px] mono-data text-muted-foreground font-black tracking-tighter">SUBSTRATE_V4.2</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                className="h-9 pl-9 text-[10px] uppercase font-bold tracking-widest border-border bg-background/30"
                placeholder="FILTER_REGISTRY..."
              />
            </div>
            <Button size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-[0.2em]">
              <Plus className="h-3 w-3 mr-2" />
              Provision Access
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Active Operators', val: '1,402', delta: '+12', icon: Users },
              { label: 'Signal Retention', val: '90 DAYS', delta: 'FIXED', icon: Database },
              { label: 'Integrity Rating', val: '99.9%', delta: 'NOMINAL', icon: Fingerprint }
            ].map((stat, i) => (
              <Card key={i} className="border-l-4 border-l-primary/50 bg-card rounded-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                    <p className="text-xl font-black mono-data">{stat.val}</p>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground opacity-10" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Data Table */}
          <Card className="rounded-sm border-border bg-card overflow-hidden">
            <div className="h-10 bg-muted/30 border-b border-border flex items-center px-6">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Master Operator Registry</span>
            </div>
            <CardContent className="p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identifier</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clearance</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telemetry</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">State</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    { id: 'OPERATOR_ALPHA_9', level: 'SU_USER', telemetry: 'ACTIVE', state: 'NOMINAL' },
                    { id: 'ANALYST_KILO_4', level: 'OPERATOR', telemetry: 'ACTIVE', state: 'NOMINAL' },
                    { id: 'GOVERNOR_NODE_1', level: 'SYSTEM', telemetry: 'PASSIVE', state: 'AUDIT' },
                    { id: 'OPERATOR_REDACTED', level: 'EXT_SUB', telemetry: 'OFFLINE', state: 'REVOKED' },
                  ].map((user, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-black mono-data tracking-tight">{user.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="ghost" className="text-[9px] border border-border px-1.5 py-0.5 font-bold uppercase">{user.level}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] mono-data text-muted-foreground font-medium">{user.telemetry}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            user.state === 'NOMINAL' ? 'bg-green-500' : user.state === 'REVOKED' ? 'bg-destructive' : 'bg-amber-500'
                          )} />
                          <span className="text-[10px] font-bold uppercase">{user.state}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Right rail: Operational Alerts */}
      <div className="w-80 border-l border-border bg-card flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border bg-background/50">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Admin_Activity_Log</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 border border-border bg-background/30 space-y-2 group hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black mono-data text-primary">EVT_042{i}</span>
                <span className="text-[9px] text-muted-foreground mono-data font-bold">04H_AGO</span>
              </div>
              <p className="text-[10px] font-bold uppercase leading-relaxed tracking-tight">Access policy updated for sector_delta</p>
              <p className="text-[9px] text-muted-foreground mono-data uppercase">User: ADMIN_MASTER_0</p>
            </div>
          ))}
        </div>
        <div className="p-4 bg-muted/30 border-t border-border">
          <Button variant="ghost" className="w-full h-10 border border-border text-[10px] font-black uppercase tracking-widest">
            Export Audit Bundle
          </Button>
        </div>
      </div>
    </div>
  )
}
