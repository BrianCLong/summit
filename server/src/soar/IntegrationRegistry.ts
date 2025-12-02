
import { ActionDefinition } from './types.js';

export class IntegrationRegistry {
  private static instance: IntegrationRegistry;
  private actions: Map<string, ActionDefinition> = new Map();

  private constructor() {
    this.registerCoreActions();
    this.registerSecurityActions();
  }

  static getInstance(): IntegrationRegistry {
    if (!IntegrationRegistry.instance) {
      IntegrationRegistry.instance = new IntegrationRegistry();
    }
    return IntegrationRegistry.instance;
  }

  registerAction(action: ActionDefinition) {
    this.actions.set(action.id, action);
  }

  getAction(id: string): ActionDefinition | undefined {
    return this.actions.get(id);
  }

  getAllActions(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  private registerCoreActions() {
    this.registerAction({
      id: 'core.log',
      name: 'Log Message',
      description: 'Logs a message to the console/audit log',
      paramsSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          level: { type: 'string', enum: ['info', 'warn', 'error'] },
        },
        required: ['message'],
      },
      execute: async (params) => {
        console.log(`[PLAYBOOK LOG] ${params.level || 'info'}: ${params.message}`);
        return { success: true };
      },
    });

    this.registerAction({
        id: 'core.delay',
        name: 'Delay',
        description: 'Wait for a specified duration',
        paramsSchema: {
            type: 'object',
            properties: {
                milliseconds: { type: 'number' }
            },
            required: ['milliseconds']
        },
        execute: async (params) => {
            await new Promise(resolve => setTimeout(resolve, params.milliseconds));
            return { success: true };
        }
    });
  }

  private registerSecurityActions() {
      // Threat Intelligence
      this.registerAction({
          id: 'ti.virustotal.lookup_ip',
          name: 'VirusTotal IP Lookup',
          description: 'Check an IP address against VirusTotal (Mock)',
          paramsSchema: {
              type: 'object',
              properties: { ip: { type: 'string' } },
              required: ['ip']
          },
          execute: async (params) => {
              // Mock response
              const reputation = Math.random() > 0.5 ? 'malicious' : 'clean';
              return {
                  ip: params.ip,
                  reputation,
                  score: reputation === 'malicious' ? 85 : 0
              };
          }
      });

      // Escalation / Ticket Management
      this.registerAction({
          id: 'jira.create_ticket',
          name: 'Create Jira Ticket',
          description: 'Create a new ticket in Jira (Mock)',
          paramsSchema: {
              type: 'object',
              properties: {
                  project: { type: 'string' },
                  summary: { type: 'string' },
                  description: { type: 'string' }
              },
              required: ['project', 'summary']
          },
          execute: async (params) => {
              return {
                  ticketId: `JIRA-${Math.floor(Math.random() * 1000)}`,
                  url: `https://jira.example.com/browse/JIRA-${Math.floor(Math.random() * 1000)}`
              };
          }
      });

      // Response Actions
      this.registerAction({
          id: 'firewall.block_ip',
          name: 'Block IP on Firewall',
          description: 'Add an IP to the blocklist (Mock)',
          paramsSchema: {
              type: 'object',
              properties: { ip: { type: 'string' } },
              required: ['ip']
          },
          execute: async (params) => {
              return { success: true, message: `IP ${params.ip} blocked on edge firewall` };
          }
      });

       this.registerAction({
          id: 'iam.disable_user',
          name: 'Disable User Account',
          description: 'Disable a user account in IAM (Mock)',
          paramsSchema: {
              type: 'object',
              properties: { userId: { type: 'string' } },
              required: ['userId']
          },
          execute: async (params) => {
              return { success: true, status: 'disabled', userId: params.userId };
          }
      });
  }
}
