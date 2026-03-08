"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusPanel = StatusPanel;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const utils_1 = require("@/lib/utils");
const statusCopy = {
    green: { emoji: '🟢', label: 'Healthy', tone: 'success' },
    yellow: { emoji: '🟡', label: 'Degraded', tone: 'warning' },
    red: { emoji: '🔴', label: 'Critical', tone: 'destructive' },
};
const EvidenceList = ({ items }) => (<div className="space-y-2">
    {items.map(item => (<a key={item.url} href={item.url} className="flex items-center gap-2 text-sm text-primary hover:underline" target="_blank" rel="noreferrer">
        <lucide_react_1.ExternalLink className="h-4 w-4"/>
        <span>{item.label}</span>
      </a>))}
  </div>);
const Checklist = ({ items }) => (<div className="space-y-2">
    {items.map(item => (<div key={item.id} className={(0, utils_1.cn)('flex items-start gap-2 rounded-md border px-3 py-2 text-sm', item.status === 'green' && 'border-emerald-200 bg-emerald-50', item.status === 'yellow' && 'border-amber-200 bg-amber-50', item.status === 'red' && 'border-red-200 bg-red-50')}>
        {item.status === 'green' && <lucide_react_1.CheckCircle2 className="h-4 w-4 text-emerald-600"/>}
        {item.status === 'yellow' && <lucide_react_1.AlertTriangle className="h-4 w-4 text-amber-600"/>}
        {item.status === 'red' && <lucide_react_1.AlertTriangle className="h-4 w-4 text-red-600"/>}
        <div className="space-y-1">
          <div className="font-medium">{item.name}</div>
          <a href={item.evidence.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
            {item.evidence.label}
          </a>
        </div>
      </div>))}
  </div>);
function StatusPanel({ title, status, fallbackTitle, children }) {
    const resolvedStatus = status?.status ?? 'red';
    const copy = statusCopy[resolvedStatus];
    const subtitle = status?.summary || 'No telemetry returned';
    return (<Card_1.Card className="h-full">
      <Card_1.CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <Card_1.CardTitle className="flex items-center gap-2">
              <span>{title}</span>
              <Badge_1.Badge variant={copy.tone}>
                {copy.emoji} {copy.label}
              </Badge_1.Badge>
            </Card_1.CardTitle>
            <Card_1.CardDescription>{subtitle}</Card_1.CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <lucide_react_1.Info className="h-4 w-4"/>
            <span>{status?.system || fallbackTitle || 'Unspecified'}</span>
          </div>
        </div>
        {status?.updatedAt && (<div className="text-xs text-muted-foreground">Updated {new Date(status.updatedAt).toLocaleString()}</div>)}
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-4">
        {children}
        {status?.signals && status.signals.length > 0 && (<div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signals</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {status.signals.map(signal => (<div key={signal.label} className={(0, utils_1.cn)('flex items-center justify-between rounded-md border px-3 py-2 text-sm', signal.status === 'green' && 'border-emerald-200 bg-emerald-50', signal.status === 'yellow' && 'border-amber-200 bg-amber-50', signal.status === 'red' && 'border-red-200 bg-red-50')}>
                  <div className="flex items-center gap-2">
                    <span>{signal.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{signal.detail}</div>
                </div>))}
            </div>
          </div>)}

        {status?.checklist && status.checklist.length > 0 && (<div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklist</div>
              <Button_1.Button variant="ghost" size="xs" asChild>
                <a href={status.evidence?.[0]?.url || '#'} target="_blank" rel="noreferrer">
                  View full artifact
                  <lucide_react_1.ArrowUpRight className="ml-1 h-3 w-3"/>
                </a>
              </Button_1.Button>
            </div>
            <Checklist items={status.checklist}/>
          </div>)}

        {status?.evidence && status.evidence.length > 0 && (<div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</div>
            <EvidenceList items={status.evidence}/>
          </div>)}
      </Card_1.CardContent>
    </Card_1.Card>);
}
