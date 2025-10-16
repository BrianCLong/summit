import {
  ApprovalBundle,
  ServerInfo,
  WorkflowDefinition,
  WorkflowInstance,
} from './types';

export interface ApprovalRequest {
  stageId: string;
  gateId: string;
  actorId: string;
  delegatedFrom?: string;
  signature: string;
  signedAt: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as T;
}

export async function fetchServerInfo(): Promise<ServerInfo> {
  const res = await fetch('/api/info');
  return handleResponse<ServerInfo>(res);
}

export async function createWorkflow(
  def: WorkflowDefinition,
): Promise<WorkflowDefinition> {
  const res = await fetch('/api/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(def),
  });
  return handleResponse<WorkflowDefinition>(res);
}

export async function startInstance(
  workflowId: string,
  context: Record<string, string>,
): Promise<WorkflowInstance> {
  const res = await fetch('/api/instances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowId, context }),
  });
  return handleResponse<WorkflowInstance>(res);
}

export async function loadInstance(
  instanceId: string,
): Promise<WorkflowInstance> {
  const res = await fetch(`/api/instances/${instanceId}`);
  return handleResponse<WorkflowInstance>(res);
}

export async function submitApproval(
  instanceId: string,
  approval: ApprovalRequest,
): Promise<ApprovalBundle | { status: string }> {
  const res = await fetch(`/api/instances/${instanceId}/approvals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(approval),
  });
  return handleResponse<ApprovalBundle | { status: string }>(res);
}
