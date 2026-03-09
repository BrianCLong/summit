import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CopilotContext } from '@/types/intelligence-os';
import { CopilotChat } from './CopilotChat';
import { CopilotSuggestions } from './CopilotSuggestions';
import { CopilotTaskRunner } from './CopilotTaskRunner';

// ---------------------------------------------------------------------------
// CopilotPanel — main container for the AI copilot assistant
// ---------------------------------------------------------------------------

export interface CopilotPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  context: CopilotContext;
  activeView?: 'chat' | 'suggestions' | 'tasks';
  onViewChange?: (view: 'chat' | 'suggestions' | 'tasks') => void;
}

const VIEWS = ['chat', 'suggestions', 'tasks'] as const;

const CopilotPanel = React.forwardRef<HTMLDivElement, CopilotPanelProps>(
  ({ className, context, activeView = 'chat', onViewChange, ...props }, ref) => {
    const [view, setView] = React.useState(activeView);

    const handleView = React.useCallback(
      (v: typeof view) => {
        setView(v);
        onViewChange?.(v);
      },
      [onViewChange],
    );

    return (
      <Card ref={ref} className={cn('flex flex-col', className)} {...props}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Intelligence Copilot</CardTitle>
            <span className="text-xs text-muted-foreground">
              {context.selectedEntityIds.length} selected &middot; {context.currentView}
            </span>
          </div>

          {/* Sub-nav */}
          <div className="flex gap-1 rounded-md bg-muted p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => handleView(v)}
                className={cn(
                  'flex-1 rounded-sm px-2 py-1 text-xs font-medium capitalize transition-colors',
                  v === view
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          {view === 'chat' && <CopilotChat context={context} />}
          {view === 'suggestions' && <CopilotSuggestions context={context} />}
          {view === 'tasks' && <CopilotTaskRunner />}
        </CardContent>
      </Card>
    );
  },
);
CopilotPanel.displayName = 'CopilotPanel';

export { CopilotPanel };
