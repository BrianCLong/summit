import { Blob } from 'node:buffer';
import { JiraApiClient, JiraApiError } from './client.js';
import { AuditLogger, createAuditEntry } from './logger.js';
import {
  AttachmentPayload,
  JiraIntegrationConfig,
  JiraLinkRequest,
  JiraTicket,
  JiraWebhookEvent,
  PerfTraceTicketInput,
  WorkflowSyncResult,
} from './types.js';

interface CreateIssueResponse {
  readonly id: string;
  readonly key: string;
  readonly self: string;
}

interface TransitionResponse {
  readonly transitions: readonly {
    readonly id: string;
    readonly name: string;
  }[];
}

export class JiraIntegrationService {
  constructor(
    private readonly config: JiraIntegrationConfig,
    private readonly client: JiraApiClient,
    private readonly auditLogger: AuditLogger,
  ) {}

  private buildCustomFields(
    input: PerfTraceTicketInput,
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    Object.entries(this.config.customFieldMap).forEach(
      ([logicalField, jiraField]) => {
        const value = (input as Record<string, unknown>)[logicalField];
        if (value === undefined) {
          return;
        }

        if (logicalField === 'owners') {
          fields[jiraField] = (input.owners ?? []).map((email) => ({
            accountId: email,
          }));
          return;
        }

        fields[jiraField] = value;
      },
    );

    const priorityEntry = this.config.priorityMapping[input.severity];
    fields.priority = { id: priorityEntry.priorityId };
    fields[priorityEntry.severityFieldId] = priorityEntry.severityValue;

    if (input.labels && input.labels.length > 0) {
      fields.labels = [...input.labels, 'perftrace'];
    } else {
      fields.labels = ['perftrace'];
    }

    if (input.additionalFields) {
      Object.assign(fields, input.additionalFields);
    }

    return fields;
  }

  async createPerfTraceTicket(
    input: PerfTraceTicketInput,
  ): Promise<JiraTicket> {
    const fields = this.buildCustomFields(input);
    const body = JSON.stringify({
      fields: {
        project: { key: this.config.projectKey },
        issuetype: { id: this.config.issueTypeId },
        summary: input.summary,
        description: input.description,
        ...fields,
      },
    });

    const ticket = await this.client.request<CreateIssueResponse>(
      '/rest/api/3/issue',
      {
        method: 'POST',
        body,
      },
    );

    this.auditLogger.record(
      createAuditEntry('create_ticket', 'success', {
        entityId: ticket.key,
        payload: { severity: input.severity, environment: input.environment },
      }),
    );

    if (input.attachments && input.attachments.length > 0) {
      await this.addAttachments(ticket.id, input.attachments);
    }

    if (input.relatedIssueKeys && input.relatedIssueKeys.length > 0) {
      await this.linkIssues(ticket.key, input.relatedIssueKeys);
    }

    return ticket;
  }

  async addAttachments(
    issueId: string,
    attachments: readonly AttachmentPayload[],
  ): Promise<void> {
    const formData = new FormData();
    attachments.forEach((attachment) => {
      const blob = new Blob([attachment.data], {
        type: attachment.contentType,
      });
      formData.append('file', blob, attachment.fileName);
    });

    await this.client.request(`/rest/api/3/issue/${issueId}/attachments`, {
      method: 'POST',
      body: formData as unknown as BodyInit,
      headers: {
        'X-Atlassian-Token': 'no-check',
      },
    });

    this.auditLogger.record(
      createAuditEntry('add_attachments', 'success', {
        entityId: issueId,
        payload: { count: attachments.length },
      }),
    );
  }

  async transitionTicket(
    issueId: string,
    targetState: string,
  ): Promise<WorkflowSyncResult> {
    const available = await this.client.request<TransitionResponse>(
      `/rest/api/3/issue/${issueId}/transitions`,
    );
    const transition = available.transitions.find(
      (item) => item.name === targetState,
    );

    if (!transition) {
      throw new JiraApiError(`Transition ${targetState} not available`, 404);
    }

    await this.client.request(`/rest/api/3/issue/${issueId}/transitions`, {
      method: 'POST',
      body: JSON.stringify({ transition: { id: transition.id } }),
    });

    this.auditLogger.record(
      createAuditEntry('transition_ticket', 'success', {
        entityId: issueId,
        payload: { targetState },
      }),
    );

    return { issueId, transitioned: true, targetState };
  }

  async syncWorkflow(
    issueId: string,
    currentStatus: string,
  ): Promise<WorkflowSyncResult> {
    const targetState = this.config.workflowTransitions[currentStatus];
    if (!targetState) {
      return { issueId, transitioned: false };
    }

    return this.transitionTicket(issueId, targetState);
  }

  async linkIssues(
    sourceIssueKey: string,
    relatedIssueKeys: readonly string[],
    linkType = 'Relates',
  ): Promise<void> {
    const payloads: JiraLinkRequest[] = relatedIssueKeys.map((relatedKey) => ({
      type: { name: linkType },
      inwardIssue: { key: sourceIssueKey },
      outwardIssue: { key: relatedKey },
    }));

    await Promise.all(
      payloads.map((payload) =>
        this.client.request('/rest/api/3/issueLink', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      ),
    );

    this.auditLogger.record(
      createAuditEntry('link_issues', 'success', {
        entityId: sourceIssueKey,
        payload: { related: relatedIssueKeys },
      }),
    );
  }

  async bulkCreatePerfTraceTickets(
    inputs: readonly PerfTraceTicketInput[],
  ): Promise<readonly JiraTicket[]> {
    const results: JiraTicket[] = [];
    for (const input of inputs) {
      try {
        const ticket = await this.createPerfTraceTicket(input);
        results.push(ticket);
      } catch (error: unknown) {
        this.auditLogger.record(
          createAuditEntry('create_ticket', 'error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            payload: { summary: input.summary },
          }),
        );
      }
    }

    return results;
  }

  handleWebhook(event: JiraWebhookEvent): WorkflowSyncResult | undefined {
    if (event.webhookEvent !== 'jira:issue_updated' || !event.changelog) {
      return undefined;
    }

    const statusChange = event.changelog.items.find(
      (item) => item.field === 'status',
    );
    if (!statusChange || !statusChange.toString) {
      return undefined;
    }

    const mappedTarget = this.config.workflowTransitions[statusChange.toString];

    const result: WorkflowSyncResult = {
      issueId: event.issue.id,
      transitioned: Boolean(mappedTarget),
      targetState: mappedTarget,
    };

    this.auditLogger.record(
      createAuditEntry('webhook_processed', 'success', {
        entityId: event.issue.key,
        payload: {
          previous: statusChange.fromString,
          current: statusChange.toString,
          mappedTarget,
        },
      }),
    );

    return result;
  }
}
