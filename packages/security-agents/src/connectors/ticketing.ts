export interface TicketDraft {
  incidentId: string;
  title: string;
  description: string;
  ownerGroup?: string;
  approvalsRequired?: string[];
}

export interface TicketDraftResult {
  ticketId: string;
  state: 'draft' | 'pending-approval' | 'submitted';
  submittedAt: string;
}

export const draftTicket = (input: TicketDraft): TicketDraftResult => {
  return {
    ticketId: `draft-${input.incidentId}`,
    state: 'draft',
    submittedAt: new Date().toISOString()
  };
};
