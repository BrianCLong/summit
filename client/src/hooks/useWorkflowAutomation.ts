/**
 * Intelligence OS — Workflow Automation hooks (Phase 9)
 *
 * Client-side workflow rule engine that evaluates triggers against incoming
 * data and dispatches automated actions.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  Entity,
  Insight,
  IntelEvent,
  WorkflowAction,
  WorkflowRule,
  WorkflowTrigger,
} from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowEvent {
  trigger: WorkflowTrigger;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface WorkflowExecution {
  ruleId: string;
  ruleName: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  executedAt: string;
}

// ---------------------------------------------------------------------------
// useWorkflowEngine — evaluate rules against incoming triggers
// ---------------------------------------------------------------------------

export function useWorkflowEngine(rules: WorkflowRule[]) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const evaluate = useCallback(
    (event: WorkflowEvent): WorkflowExecution[] => {
      const matching = rulesRef.current.filter(
        (r) => r.enabled && r.trigger === event.trigger,
      );

      const results: WorkflowExecution[] = matching.map((rule) => ({
        ruleId: rule.id,
        ruleName: rule.name,
        trigger: event.trigger,
        actions: rule.actions,
        executedAt: new Date().toISOString(),
      }));

      if (results.length > 0) {
        setExecutions((prev) => [...prev, ...results]);
      }

      return results;
    },
    [],
  );

  const clearHistory = useCallback(() => setExecutions([]), []);

  return { executions, evaluate, clearHistory } as const;
}

// ---------------------------------------------------------------------------
// Convenience trigger helpers
// ---------------------------------------------------------------------------

export function triggerAnomalyDetected(insight: Insight): WorkflowEvent {
  return {
    trigger: 'anomaly_detected',
    payload: { insightId: insight.id, severity: insight.severity },
    timestamp: new Date().toISOString(),
  };
}

export function triggerNewEntity(entity: Entity): WorkflowEvent {
  return {
    trigger: 'new_entity',
    payload: { entityId: entity.id, entityType: entity.type },
    timestamp: new Date().toISOString(),
  };
}

export function triggerNewEvent(event: IntelEvent): WorkflowEvent {
  return {
    trigger: 'new_event',
    payload: { eventId: event.id, eventType: event.type },
    timestamp: new Date().toISOString(),
  };
}

export function triggerAgentResult(agentId: string, result: Record<string, unknown>): WorkflowEvent {
  return {
    trigger: 'agent_result',
    payload: { agentId, result },
    timestamp: new Date().toISOString(),
  };
}
