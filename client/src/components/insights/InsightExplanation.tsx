import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Insight, Severity } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// InsightExplanation — detailed view of a single insight with explanation
// ---------------------------------------------------------------------------

export interface InsightExplanationProps extends React.HTMLAttributes<HTMLDivElement> {
  insight: Insight;
  onEntitySelect?: (entityId: string) => void;
  onInvestigate?: (insight: Insight) => void;
}

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  info: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

const InsightExplanation = React.forwardRef<HTMLDivElement, InsightExplanationProps>(
  ({ className, insight, onEntitySelect, onInvestigate, ...props }, ref) => {
    return (
      <Card ref={ref} className={cn(className)} {...props}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Badge className={cn('text-[10px]', SEVERITY_STYLES[insight.severity])}>
              {insight.severity}
            </Badge>
            <Badge variant="outline" className="text-[10px] capitalize">
              {insight.type.replace('_', ' ')}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {Math.round(insight.confidence * 100)}% confidence
            </span>
          </div>
          <CardTitle className="text-base">{insight.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{insight.description}</p>

          {/* Explanation */}
          <div className="rounded-md border bg-muted/30 p-3">
            <h4 className="mb-1 text-xs font-medium text-muted-foreground">Explanation</h4>
            <p className="text-sm">{insight.explanation}</p>
          </div>

          {/* Linked entities */}
          {insight.entityIds.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">Related Entities</h4>
              <div className="flex flex-wrap gap-1">
                {insight.entityIds.map((eid) => (
                  <button
                    key={eid}
                    onClick={() => onEntitySelect?.(eid)}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary hover:bg-primary/20"
                  >
                    {eid}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Source: {insight.source.replace('_', ' ')}</span>
            <span>Discovered: {new Date(insight.discoveredAt).toLocaleString()}</span>
            {insight.acknowledgedAt && (
              <span>Acknowledged: {new Date(insight.acknowledgedAt).toLocaleString()}</span>
            )}
          </div>

          {/* Actions */}
          {insight.actionable && onInvestigate && (
            <button
              onClick={() => onInvestigate(insight)}
              className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open Investigation
            </button>
          )}
        </CardContent>
      </Card>
    );
  },
);
InsightExplanation.displayName = 'InsightExplanation';

export { InsightExplanation };
