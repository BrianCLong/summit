export interface Ticket {
  id: string;
  external_id: string;
  key: string;
  url: string;
  title: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface TicketingAdapter {
  createTicket(incident: any): Promise<Ticket>;
  syncTicket(ticketId: string): Promise<Ticket>;
}
