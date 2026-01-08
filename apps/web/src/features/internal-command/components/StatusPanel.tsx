/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React from 'react'
import {
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type {
  ChecklistItem,
  EvidenceLink,
  StatusLevel,
  StatusResponse,
} from '../types'
import { cn } from '@/lib/utils'

const statusCopy: Record<
  StatusLevel,
  { emoji: string; label: string; tone: 'success' | 'warning' | 'destructive' }
> = {
  green: { emoji: '🟢', label: 'Healthy', tone: 'success' },
  yellow: { emoji: '🟡', label: 'Degraded', tone: 'warning' },
  red: { emoji: '🔴', label: 'Critical', tone: 'destructive' },
}

interface StatusPanelProps {
  title: string
  status?: StatusResponse
  fallbackTitle?: string
  children?: React.ReactNode
}

const EvidenceList = ({ items }: { items: EvidenceLink[] }) => (
  <div className="space-y-2">
    {items.map(item => (
      <a
        key={item.url}
        href={item.url}
        className="flex items-center gap-2 text-sm text-primary hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLink className="h-4 w-4" />
        <span>{item.label}</span>
      </a>
    ))}
  </div>
)

const Checklist = ({ items }: { items: ChecklistItem[] }) => (
  <div className="space-y-2">
    {items.map(item => (
      <div
        key={item.id}
        className={cn(
          'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
          item.status === 'green' && 'border-emerald-200 bg-emerald-50',
          item.status === 'yellow' && 'border-amber-200 bg-amber-50',
          item.status === 'red' && 'border-red-200 bg-red-50'
        )}
      >
        {item.status === 'green' && (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        )}
        {item.status === 'yellow' && (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        )}
        {item.status === 'red' && (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        )}
        <div className="space-y-1">
          <div className="font-medium">{item.name}</div>
          <a
            href={item.evidence.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            {item.evidence.label}
          </a>
        </div>
      </div>
    ))}
  </div>
)

export function StatusPanel({
  title,
  status,
  fallbackTitle,
  children,
}: StatusPanelProps) {
  const resolvedStatus: StatusLevel = status?.status ?? 'red'
  const copy = statusCopy[resolvedStatus]
  const subtitle = status?.summary || 'No telemetry returned'

  return (
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>{title}</span>
              <Badge variant={copy.tone}>
                {copy.emoji} {copy.label}
              </Badge>
            </CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>{status?.system || fallbackTitle || 'Unspecified'}</span>
          </div>
        </div>
        {status?.updatedAt && (
          <div className="text-xs text-muted-foreground">
            Updated {new Date(status.updatedAt).toLocaleString()}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {status?.signals && status.signals.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Signals
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {status.signals.map(signal => (
                <div
                  key={signal.label}
                  className={cn(
                    'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
                    signal.status === 'green' &&
                      'border-emerald-200 bg-emerald-50',
                    signal.status === 'yellow' &&
                      'border-amber-200 bg-amber-50',
                    signal.status === 'red' && 'border-red-200 bg-red-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{signal.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {signal.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {status?.checklist && status.checklist.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Checklist
              </div>
              <Button variant="ghost" size="xs" asChild>
                <a
                  href={status.evidence?.[0]?.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  View full artifact
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
            <Checklist items={status.checklist} />
          </div>
        )}

        {status?.evidence && status.evidence.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Evidence
            </div>
            <EvidenceList items={status.evidence} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
