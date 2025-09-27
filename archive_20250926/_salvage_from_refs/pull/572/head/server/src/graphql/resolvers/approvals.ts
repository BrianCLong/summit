import { v4 as uuid } from 'uuid';

interface Approval {
  id: string;
  stepId: string;
  playbook: string;
  requestedAt: string;
  approvers: string[];
  status: string;
}

const approvals: Approval[] = [];

export const approvalResolvers = {
  Query: {
    approvals: () => approvals
  },
  Mutation: {
    approve: (_: any, { id, reason }: any) => update(id, 'approved', reason),
    reject: (_: any, { id, reason }: any) => update(id, 'rejected', reason)
  }
};

function update(id: string, status: string, _reason: string) {
  const a = approvals.find(ap => ap.id === id);
  if (!a) throw new Error('approval_not_found');
  a.status = status;
  return a;
}

export function enqueue(stepId: string, playbook: string, approvers: string[]): Approval {
  const a: Approval = {
    id: uuid(),
    stepId,
    playbook,
    requestedAt: new Date().toISOString(),
    approvers,
    status: 'pending'
  };
  approvals.push(a);
  return a;
}
