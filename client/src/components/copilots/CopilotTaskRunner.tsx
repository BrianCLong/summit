import * as React from 'react';

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { CopilotTask } from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// CopilotTaskRunner — manage and monitor copilot-launched tasks
// ---------------------------------------------------------------------------

export interface CopilotTaskRunnerProps extends React.HTMLAttributes<HTMLDivElement> {
  tasks?: CopilotTask[];
  onCancel?: (taskId: string) => void;
}

const STATUS_STYLES: Record<CopilotTask['status'], string> = {
  pending: 'text-muted-foreground',
  running: 'text-blue-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
};

const CopilotTaskRunner = React.forwardRef<HTMLDivElement, CopilotTaskRunnerProps>(
  ({ className, tasks = [], onCancel, ...props }, ref) => {
    if (tasks.length === 0) {
      return (
        <div
          ref={ref}
          className={cn('py-8 text-center text-sm text-muted-foreground', className)}
          {...props}
        >
          No active tasks. Use the copilot to launch OSINT searches, graph queries, or agent runs.
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
        {tasks.map((task) => (
          <div key={task.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{task.label}</span>
              <span className={cn('text-xs font-medium capitalize', STATUS_STYLES[task.status])}>
                {task.status}
              </span>
            </div>

            {task.status === 'running' && (
              <Progress value={task.progress} className="mt-2 h-1.5" />
            )}

            {task.status === 'running' && onCancel && (
              <button
                onClick={() => onCancel(task.id)}
                className="mt-2 text-xs text-muted-foreground hover:text-destructive"
              >
                Cancel
              </button>
            )}

            {task.completedAt && (
              <span className="mt-1 block text-xs text-muted-foreground">
                Completed {new Date(task.completedAt).toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  },
);
CopilotTaskRunner.displayName = 'CopilotTaskRunner';

export { CopilotTaskRunner };
