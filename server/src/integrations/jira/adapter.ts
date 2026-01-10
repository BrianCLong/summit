import axios from 'axios';
import { TicketingAdapter, Ticket } from '../types/ticketing.js';

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  issueType?: string;
}

export class JiraAdapter implements TicketingAdapter {
  constructor(private config: JiraConfig) {}

  async createTicket(incident: any): Promise<Ticket> {
    const summary = `Incident: ${incident.title}`;
    const description = `${incident.description}\n\nSeverity: ${incident.severity}\nLink: ${process.env.APP_URL}/incidents/${incident.id}`;

    const body = {
      fields: {
        project: {
          key: this.config.projectKey,
        },
        summary,
        description,
        issuetype: {
          name: this.config.issueType || 'Incident',
        },
        // Custom fields can be mapped here
      },
    };

    const response = await axios.post(`${this.config.baseUrl}/rest/api/3/issue`, body, {
      auth: {
        username: this.config.email,
        password: this.config.apiToken,
      },
    });

    const { id, key, self } = response.data;
    return {
      id,
      external_id: id,
      key,
      url: `${this.config.baseUrl}/browse/${key}`,
      title: summary,
      status: 'New', // Default
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  async syncTicket(ticketId: string): Promise<Ticket> {
    // Implement fetch
    return {} as any;
  }
}
