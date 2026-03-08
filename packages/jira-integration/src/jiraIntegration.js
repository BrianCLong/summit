"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraIntegrationService = void 0;
// Use global Blob instead of node:buffer Blob for FormData compatibility
const client_js_1 = require("./client.js");
const logger_js_1 = require("./logger.js");
class JiraIntegrationService {
    config;
    client;
    auditLogger;
    constructor(config, client, auditLogger) {
        this.config = config;
        this.client = client;
        this.auditLogger = auditLogger;
    }
    buildCustomFields(input) {
        const fields = {};
        Object.entries(this.config.customFieldMap).forEach(([logicalField, jiraField]) => {
            const value = input[logicalField];
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
        });
        const priorityEntry = this.config.priorityMapping[input.severity];
        fields.priority = { id: priorityEntry.priorityId };
        fields[priorityEntry.severityFieldId] = priorityEntry.severityValue;
        if (input.labels && input.labels.length > 0) {
            fields.labels = [...input.labels, 'perftrace'];
        }
        else {
            fields.labels = ['perftrace'];
        }
        if (input.additionalFields) {
            Object.assign(fields, input.additionalFields);
        }
        return fields;
    }
    async createPerfTraceTicket(input) {
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
        const ticket = await this.client.request('/rest/api/3/issue', {
            method: 'POST',
            body,
        });
        this.auditLogger.record((0, logger_js_1.createAuditEntry)('create_ticket', 'success', {
            entityId: ticket.key,
            payload: { severity: input.severity, environment: input.environment },
        }));
        if (input.attachments && input.attachments.length > 0) {
            await this.addAttachments(ticket.id, input.attachments);
        }
        if (input.relatedIssueKeys && input.relatedIssueKeys.length > 0) {
            await this.linkIssues(ticket.key, input.relatedIssueKeys);
        }
        return ticket;
    }
    async addAttachments(issueId, attachments) {
        const formData = new FormData();
        attachments.forEach((attachment) => {
            // Convert Buffer to Uint8Array for Blob compatibility
            const uint8Array = new Uint8Array(attachment.data);
            const blob = new Blob([uint8Array], {
                type: attachment.contentType,
            });
            formData.append('file', blob, attachment.fileName);
        });
        await this.client.request(`/rest/api/3/issue/${issueId}/attachments`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Atlassian-Token': 'no-check',
            },
        });
        this.auditLogger.record((0, logger_js_1.createAuditEntry)('add_attachments', 'success', {
            entityId: issueId,
            payload: { count: attachments.length },
        }));
    }
    async transitionTicket(issueId, targetState) {
        const available = await this.client.request(`/rest/api/3/issue/${issueId}/transitions`);
        const transition = available.transitions.find((item) => item.name === targetState);
        if (!transition) {
            throw new client_js_1.JiraApiError(`Transition ${targetState} not available`, 404);
        }
        await this.client.request(`/rest/api/3/issue/${issueId}/transitions`, {
            method: 'POST',
            body: JSON.stringify({ transition: { id: transition.id } }),
        });
        this.auditLogger.record((0, logger_js_1.createAuditEntry)('transition_ticket', 'success', {
            entityId: issueId,
            payload: { targetState },
        }));
        return { issueId, transitioned: true, targetState };
    }
    async syncWorkflow(issueId, currentStatus) {
        const targetState = this.config.workflowTransitions[currentStatus];
        if (!targetState) {
            return { issueId, transitioned: false };
        }
        return this.transitionTicket(issueId, targetState);
    }
    async linkIssues(sourceIssueKey, relatedIssueKeys, linkType = 'Relates') {
        const payloads = relatedIssueKeys.map((relatedKey) => ({
            type: { name: linkType },
            inwardIssue: { key: sourceIssueKey },
            outwardIssue: { key: relatedKey },
        }));
        await Promise.all(payloads.map((payload) => this.client.request('/rest/api/3/issueLink', {
            method: 'POST',
            body: JSON.stringify(payload),
        })));
        this.auditLogger.record((0, logger_js_1.createAuditEntry)('link_issues', 'success', {
            entityId: sourceIssueKey,
            payload: { related: relatedIssueKeys },
        }));
    }
    async bulkCreatePerfTraceTickets(inputs) {
        const results = [];
        for (const input of inputs) {
            try {
                const ticket = await this.createPerfTraceTicket(input);
                results.push(ticket);
            }
            catch (error) {
                this.auditLogger.record((0, logger_js_1.createAuditEntry)('create_ticket', 'error', {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    payload: { summary: input.summary },
                }));
            }
        }
        return results;
    }
    handleWebhook(event) {
        if (event.webhookEvent !== 'jira:issue_updated' || !event.changelog) {
            return undefined;
        }
        const statusChange = event.changelog.items.find((item) => item.field === 'status');
        if (!statusChange || !statusChange.toString) {
            return undefined;
        }
        const mappedTarget = this.config.workflowTransitions[statusChange.toString];
        const result = {
            issueId: event.issue.id,
            transitioned: Boolean(mappedTarget),
            ...(mappedTarget && { targetState: mappedTarget }),
        };
        this.auditLogger.record((0, logger_js_1.createAuditEntry)('webhook_processed', 'success', {
            entityId: event.issue.key,
            payload: {
                previous: statusChange.fromString,
                current: statusChange.toString,
                mappedTarget,
            },
        }));
        return result;
    }
}
exports.JiraIntegrationService = JiraIntegrationService;
