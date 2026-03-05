export type ActionEnvelope = {
  intent: 'execute',
  proposal: string,
  requires_approval: boolean,
  status: 'pending' | 'approved' | 'rejected'
};

export function createActionProposal(command: string): ActionEnvelope {
  return {
    intent: 'execute',
    proposal: command,
    requires_approval: true,
    status: 'pending'
  };
}
