import * as React from 'react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CopilotContext, CopilotSuggestion } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// CopilotSuggestions — AI-generated suggestions based on current context
// ---------------------------------------------------------------------------

export interface CopilotSuggestionsProps extends React.HTMLAttributes<HTMLDivElement> {
  context: CopilotContext;
  suggestions?: CopilotSuggestion[];
  onAccept?: (suggestion: CopilotSuggestion) => void;
  onDismiss?: (id: string) => void;
}

const TYPE_COLORS: Record<CopilotSuggestion['type'], string> = {
  query: 'bg-blue-500/10 text-blue-400',
  connection: 'bg-purple-500/10 text-purple-400',
  investigation: 'bg-green-500/10 text-green-400',
  osint: 'bg-orange-500/10 text-orange-400',
  action: 'bg-cyan-500/10 text-cyan-400',
};

const CopilotSuggestions = React.forwardRef<HTMLDivElement, CopilotSuggestionsProps>(
  ({ className, suggestions = [], onAccept, onDismiss, ...props }, ref) => {
    if (suggestions.length === 0) {
      return (
        <div
          ref={ref}
          className={cn('py-8 text-center text-sm text-muted-foreground', className)}
          {...props}
        >
          No suggestions available. Select entities or navigate to generate context-aware suggestions.
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
        {suggestions.map((s) => (
          <div
            key={s.id}
            className="flex flex-col gap-1 rounded-md border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Badge className={cn('text-[10px]', TYPE_COLORS[s.type])}>{s.type}</Badge>
              <span className="text-sm font-medium">{s.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {Math.round(s.confidence * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{s.description}</p>
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => onAccept?.(s)}
                className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
              >
                Accept
              </button>
              <button
                onClick={() => onDismiss?.(s.id)}
                className="rounded-sm px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  },
);
CopilotSuggestions.displayName = 'CopilotSuggestions';

export { CopilotSuggestions };
