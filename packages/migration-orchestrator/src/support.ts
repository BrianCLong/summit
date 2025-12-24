export class SupportManager {
  constructor() {
    this.runbooks = new Map();
    this.supportTickets = new Map();
  }

  setRunbook(tenantId, steps) {
    this.runbooks.set(tenantId, steps);
  }

  addTicket(tenantId, ticket) {
    const tickets = this.supportTickets.get(tenantId) ?? [];
    tickets.push(ticket);
    this.supportTickets.set(tenantId, tickets);
  }

  getRunbook(tenantId) {
    return this.runbooks.get(tenantId) ?? [];
  }

  getTickets(tenantId) {
    return this.supportTickets.get(tenantId) ?? [];
  }
}
