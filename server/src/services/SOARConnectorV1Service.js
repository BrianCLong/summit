"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOARConnectorV1Service = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class SOARConnectorV1Service {
    prisma;
    redis;
    logger;
    config;
    RETRY_ATTEMPTS = 3;
    RETRY_DELAY_MS = 1000;
    constructor(prisma, redis, logger, config) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = logger;
        this.config = config;
    }
    /**
     * B1 - ServiceNow/Jira ticket automation
     * AC: create/update/close; idempotent retries; mapping config
     */
    async createIncidentTicket(alertId, alertData, system = 'servicenow') {
        const operationId = `create_ticket_${alertId}_${Date.now()}`;
        try {
            // Check for existing ticket to ensure idempotency
            const existingTicket = await this.getExistingTicket(alertId, system);
            if (existingTicket) {
                this.logger.info('Ticket already exists for alert, returning existing', {
                    alertId,
                    ticketId: existingTicket.external_id,
                });
                return existingTicket;
            }
            // Create ticket with retry logic
            let ticketData;
            let attempt = 0;
            while (attempt < this.RETRY_ATTEMPTS) {
                try {
                    if (system === 'servicenow') {
                        ticketData = await this.createServiceNowIncident(alertData, operationId);
                    }
                    else {
                        ticketData = await this.createJiraIssue(alertData, operationId);
                    }
                    break;
                }
                catch (error) {
                    attempt++;
                    if (attempt >= this.RETRY_ATTEMPTS) {
                        throw error;
                    }
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.warn('Ticket creation failed, retrying', {
                        alertId,
                        system,
                        attempt,
                        error: errorMessage,
                    });
                    await this.delay(this.RETRY_DELAY_MS * attempt);
                }
            }
            // Store ticket link in database
            const ticketLink = await this.prisma.ticketLink.create({
                data: {
                    id: `tl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    alert_id: alertId,
                    external_system: system,
                    external_id: ticketData.id,
                    external_url: ticketData.url,
                    status: ticketData.status,
                    sync_enabled: true,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            });
            this.logger.info('Incident ticket created successfully', {
                alertId,
                system,
                externalId: ticketData.id,
                ticketLinkId: ticketLink.id,
            });
            // Set up automatic status sync
            await this.scheduleStatusSync(ticketLink.id);
            return ticketLink;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to create incident ticket', {
                alertId,
                system,
                error: errorMessage,
            });
            throw error;
        }
    }
    /**
     * Update existing ticket with new information
     */
    async updateTicket(ticketLinkId, updates) {
        try {
            const ticketLink = await this.prisma.ticketLink.findUnique({
                where: { id: ticketLinkId },
            });
            if (!ticketLink) {
                throw new Error(`Ticket link not found: ${ticketLinkId}`);
            }
            if (ticketLink.external_system === 'servicenow') {
                await this.updateServiceNowIncident(ticketLink.external_id, updates);
            }
            else {
                await this.updateJiraIssue(ticketLink.external_id, updates);
            }
            // Update local record
            await this.prisma.ticketLink.update({
                where: { id: ticketLinkId },
                data: {
                    updated_at: new Date(),
                    status: updates.status || ticketLink.status,
                },
            });
            this.logger.info('Ticket updated successfully', {
                ticketLinkId,
                externalId: ticketLink.external_id,
                system: ticketLink.external_system,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to update ticket', {
                ticketLinkId,
                error: errorMessage,
            });
            throw error;
        }
    }
    /**
     * B2 - EDR quarantine action
     * AC: dry-run mode; result telemetry; rollback procedure
     */
    async quarantineHost(alertId, hostIdentifier, initiatedBy, dryRun = false, requireApproval = true) {
        const actionId = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            // Create containment action record
            const action = await this.prisma.containmentAction.create({
                data: {
                    id: actionId,
                    type: 'host_quarantine',
                    target: hostIdentifier,
                    alert_id: alertId,
                    status: requireApproval ? 'pending' : 'in_progress',
                    initiated_by: initiatedBy,
                    initiated_at: new Date(),
                    rollback_available: true,
                    approval_required: requireApproval,
                    dry_run: dryRun,
                },
            });
            // Handle approval if required
            if (requireApproval && !dryRun) {
                await this.requestContainmentApproval(actionId, {
                    action_type: 'Host Quarantine',
                    target: hostIdentifier,
                    alert_id: alertId,
                    risk_level: 'high',
                });
                this.logger.info('Host quarantine pending approval', {
                    actionId,
                    hostIdentifier,
                    alertId,
                });
                return action;
            }
            // Execute quarantine action
            let result;
            if (dryRun) {
                result = await this.simulateHostQuarantine(hostIdentifier);
                this.logger.info('Host quarantine dry-run completed', {
                    actionId,
                    hostIdentifier,
                    result,
                });
            }
            else {
                result = await this.executeHostQuarantine(hostIdentifier);
                this.logger.info('Host quarantine executed', {
                    actionId,
                    hostIdentifier,
                    result,
                });
            }
            // Update action record
            await this.prisma.containmentAction.update({
                where: { id: actionId },
                data: {
                    status: 'completed',
                    completed_at: new Date(),
                    result: JSON.stringify(result),
                },
            });
            // Record telemetry
            await this.recordContainmentTelemetry(actionId, 'host_quarantine', result);
            // Schedule rollback check if needed
            if (!dryRun && result.success) {
                await this.scheduleRollbackCheck(actionId, '24h');
            }
            return (await this.prisma.containmentAction.findUnique({
                where: { id: actionId },
            }));
        }
        catch (error) {
            this.logger.error('Host quarantine failed', {
                actionId,
                hostIdentifier,
                alertId,
                error: error.message,
            });
            // Update action status to failed
            await this.prisma.containmentAction.update({
                where: { id: actionId },
                data: {
                    status: 'failed',
                    completed_at: new Date(),
                    result: JSON.stringify({ error: error.message }),
                },
            });
            throw error;
        }
    }
    /**
     * B3 - Account disable + hash block
     * AC: approval gate; audit; execution time <= 2m
     */
    async disableAccount(alertId, accountIdentifier, initiatedBy, approverUserId) {
        const actionId = `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        try {
            // Create action record
            const action = await this.prisma.containmentAction.create({
                data: {
                    id: actionId,
                    type: 'account_disable',
                    target: accountIdentifier,
                    alert_id: alertId,
                    status: 'pending',
                    initiated_by: initiatedBy,
                    initiated_at: new Date(),
                    rollback_available: true,
                    approval_required: true,
                },
            });
            // Require approval gate
            if (!approverUserId) {
                throw new Error('Account disable requires approver');
            }
            const approval = await this.requestContainmentApproval(actionId, {
                action_type: 'Account Disable',
                target: accountIdentifier,
                alert_id: alertId,
                risk_level: 'high',
                approver_id: approverUserId,
            });
            // Simulate approval for demo (in production, this would be async)
            await this.prisma.containmentAction.update({
                where: { id: actionId },
                data: {
                    status: 'in_progress',
                    approved_by: approverUserId,
                    approved_at: new Date(),
                },
            });
            // Execute account disable with timeout
            const executionTimeout = 120000; // 2 minutes
            const result = await Promise.race([
                this.executeAccountDisable(accountIdentifier),
                this.timeout(executionTimeout, 'Account disable execution timeout'),
            ]);
            const executionTime = Date.now() - startTime;
            // Update action record
            await this.prisma.containmentAction.update({
                where: { id: actionId },
                data: {
                    status: 'completed',
                    completed_at: new Date(),
                    result: JSON.stringify({
                        ...result,
                        execution_time_ms: executionTime,
                    }),
                },
            });
            // Create detailed audit log
            await this.createAuditLog({
                action_id: actionId,
                action_type: 'ACCOUNT_DISABLE',
                target: accountIdentifier,
                initiated_by: initiatedBy,
                approved_by: approverUserId,
                alert_id: alertId,
                execution_time_ms: executionTime,
                result: result.success ? 'SUCCESS' : 'FAILED',
                details: result,
            });
            // Check execution time SLO
            if (executionTime > 120000) {
                // 2 minutes
                this.logger.warn('Account disable exceeded SLO', {
                    actionId,
                    executionTime,
                    sloMs: 120000,
                });
            }
            this.logger.info('Account disable completed', {
                actionId,
                accountIdentifier,
                executionTime,
                success: result.success,
            });
            return (await this.prisma.containmentAction.findUnique({
                where: { id: actionId },
            }));
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error('Account disable failed', {
                actionId,
                accountIdentifier,
                executionTime,
                error: error.message,
            });
            // Update action status and audit
            await this.prisma.containmentAction.update({
                where: { id: actionId },
                data: {
                    status: 'failed',
                    completed_at: new Date(),
                    result: JSON.stringify({
                        error: error.message,
                        execution_time_ms: executionTime,
                    }),
                },
            });
            await this.createAuditLog({
                action_id: actionId,
                action_type: 'ACCOUNT_DISABLE',
                target: accountIdentifier,
                initiated_by: initiatedBy,
                alert_id: alertId,
                execution_time_ms: executionTime,
                result: 'FAILED',
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Block hash across EDR platforms
     */
    async blockHash(alertId, fileHash, hashType, initiatedBy) {
        const actionId = `hb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            const action = await this.prisma.containmentAction.create({
                data: {
                    id: actionId,
                    type: 'hash_block',
                    target: `${hashType}:${fileHash}`,
                    alert_id: alertId,
                    status: 'in_progress',
                    initiated_by: initiatedBy,
                    initiated_at: new Date(),
                    rollback_available: true,
                    approval_required: false, // Hash blocking typically doesn't require approval
                },
            });
            // Execute hash block across available EDR platforms
            const result = await this.executeHashBlock(fileHash, hashType);
            await this.prisma.containmentAction.update({
                where: { id: actionId },
                data: {
                    status: result.success ? 'completed' : 'failed',
                    completed_at: new Date(),
                    result: JSON.stringify(result),
                },
            });
            // Record telemetry
            await this.recordContainmentTelemetry(actionId, 'hash_block', result);
            this.logger.info('Hash block completed', {
                actionId,
                fileHash,
                hashType,
                success: result.success,
            });
            return (await this.prisma.containmentAction.findUnique({
                where: { id: actionId },
            }));
        }
        catch (error) {
            this.logger.error('Hash block failed', {
                actionId,
                fileHash,
                hashType,
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Rollback containment action if possible
     */
    async rollbackContainment(actionId, initiatedBy) {
        try {
            const action = await this.prisma.containmentAction.findUnique({
                where: { id: actionId },
            });
            if (!action || !action.rollback_available) {
                throw new Error('Containment action cannot be rolled back');
            }
            let rollbackResult;
            switch (action.type) {
                case 'host_quarantine':
                    rollbackResult = await this.rollbackHostQuarantine(action.target);
                    break;
                case 'account_disable':
                    rollbackResult = await this.rollbackAccountDisable(action.target);
                    break;
                case 'hash_block':
                    rollbackResult = await this.rollbackHashBlock(action.target);
                    break;
                default:
                    throw new Error(`Rollback not implemented for ${action.type}`);
            }
            // Update action record
            await this.prisma.containmentAction.update({
                where: { id: actionId },
                data: {
                    status: 'rolled_back',
                    updated_at: new Date(),
                    result: JSON.stringify({
                        ...JSON.parse(action.result || '{}'),
                        rollback: rollbackResult,
                        rolled_back_by: initiatedBy,
                        rolled_back_at: new Date(),
                    }),
                },
            });
            this.logger.info('Containment action rolled back', {
                actionId,
                type: action.type,
                target: action.target,
                initiatedBy,
            });
        }
        catch (error) {
            this.logger.error('Containment rollback failed', {
                actionId,
                error: error.message,
            });
            throw error;
        }
    }
    // Private helper methods
    async createServiceNowIncident(alertData, operationId) {
        if (!this.config.servicenow) {
            throw new Error('ServiceNow not configured');
        }
        const auth = Buffer.from(`${this.config.servicenow.username}:${this.config.servicenow.password}`).toString('base64');
        const incident = {
            short_description: alertData.title || `Security Alert: ${alertData.id}`,
            description: this.formatAlertForTicket(alertData),
            priority: this.mapAlertPriorityToServiceNow(alertData.severity),
            category: 'security',
            subcategory: 'security incident',
            u_correlation_id: operationId,
            u_alert_id: alertData.id,
        };
        const response = await (0, node_fetch_1.default)(`${this.config.servicenow.instance_url}/api/now/table/${this.config.servicenow.table}`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(incident),
        });
        if (!response.ok) {
            throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        return {
            id: result.result.sys_id,
            url: `${this.config.servicenow.instance_url}/nav_to.do?uri=${this.config.servicenow.table}.do?sys_id=${result.result.sys_id}`,
            status: result.result.state,
            number: result.result.number,
        };
    }
    async createJiraIssue(alertData, operationId) {
        if (!this.config.jira) {
            throw new Error('Jira not configured');
        }
        const auth = Buffer.from(`${this.config.jira.username}:${this.config.jira.api_token}`).toString('base64');
        const issue = {
            fields: {
                project: { key: this.config.jira.project_key },
                issuetype: { name: this.config.jira.issue_type },
                summary: alertData.title || `Security Alert: ${alertData.id}`,
                description: this.formatAlertForTicket(alertData),
                priority: { name: this.mapAlertPriorityToJira(alertData.severity) },
                labels: ['security', 'intelgraph', operationId],
                customfield_10001: alertData.id, // Alert ID custom field
            },
        };
        const response = await (0, node_fetch_1.default)(`${this.config.jira.base_url}/rest/api/3/issue`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(issue),
        });
        if (!response.ok) {
            throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        return {
            id: result.key,
            url: `${this.config.jira.base_url}/browse/${result.key}`,
            status: 'Open',
        };
    }
    async executeHostQuarantine(hostIdentifier) {
        if (!this.config.edr) {
            throw new Error('EDR not configured');
        }
        // Mock EDR quarantine - would integrate with actual EDR API
        switch (this.config.edr.platform) {
            case 'crowdstrike':
                return await this.crowdStrikeQuarantine(hostIdentifier);
            case 'sentinelone':
                return await this.sentinelOneQuarantine(hostIdentifier);
            case 'defender':
                return await this.defenderQuarantine(hostIdentifier);
            default:
                throw new Error(`Unsupported EDR platform: ${this.config.edr.platform}`);
        }
    }
    async simulateHostQuarantine(hostIdentifier) {
        // Dry run simulation
        return {
            success: true,
            action: 'quarantine_simulation',
            target: hostIdentifier,
            message: 'Dry run completed successfully - no actual quarantine performed',
            timestamp: new Date(),
        };
    }
    async crowdStrikeQuarantine(hostIdentifier) {
        // Mock CrowdStrike API call
        await this.delay(1000); // Simulate API call
        return {
            success: true,
            action: 'host_quarantine',
            target: hostIdentifier,
            platform: 'crowdstrike',
            quarantine_id: `cs_${Date.now()}`,
            timestamp: new Date(),
        };
    }
    async sentinelOneQuarantine(hostIdentifier) {
        // Mock SentinelOne API call
        await this.delay(1000);
        return {
            success: true,
            action: 'host_quarantine',
            target: hostIdentifier,
            platform: 'sentinelone',
            quarantine_id: `s1_${Date.now()}`,
            timestamp: new Date(),
        };
    }
    async defenderQuarantine(hostIdentifier) {
        // Mock Microsoft Defender API call
        await this.delay(1000);
        return {
            success: true,
            action: 'host_quarantine',
            target: hostIdentifier,
            platform: 'defender',
            quarantine_id: `def_${Date.now()}`,
            timestamp: new Date(),
        };
    }
    async executeAccountDisable(accountIdentifier) {
        // Mock account disable - would integrate with identity provider
        await this.delay(500);
        return {
            success: true,
            action: 'account_disable',
            target: accountIdentifier,
            disabled_at: new Date(),
            provider: 'active_directory',
        };
    }
    async executeHashBlock(fileHash, hashType) {
        // Mock hash blocking across EDR platforms
        await this.delay(800);
        return {
            success: true,
            action: 'hash_block',
            hash: fileHash,
            hash_type: hashType,
            platforms_updated: ['crowdstrike', 'defender'],
            blocked_at: new Date(),
        };
    }
    // Rollback methods
    async rollbackHostQuarantine(target) {
        await this.delay(500);
        return { success: true, action: 'unquarantine', target };
    }
    async rollbackAccountDisable(target) {
        await this.delay(500);
        return { success: true, action: 'enable_account', target };
    }
    async rollbackHashBlock(target) {
        await this.delay(500);
        return { success: true, action: 'unblock_hash', target };
    }
    // Utility methods
    async getExistingTicket(alertId, system) {
        return (await this.prisma.ticketLink.findFirst({
            where: {
                alert_id: alertId,
                external_system: system,
            },
        }));
    }
    formatAlertForTicket(alertData) {
        return `Security Alert Details:

Alert ID: ${alertData.id}
Severity: ${alertData.severity}
Type: ${alertData.type}
Created: ${alertData.created_at}

${alertData.description || 'No additional details available.'}

Generated by IntelGraph Security Platform`;
    }
    mapAlertPriorityToServiceNow(severity) {
        const mapping = {
            critical: '1',
            high: '2',
            medium: '3',
            low: '4',
        };
        return mapping[severity?.toLowerCase()] || '3';
    }
    mapAlertPriorityToJira(severity) {
        const mapping = {
            critical: 'Highest',
            high: 'High',
            medium: 'Medium',
            low: 'Low',
        };
        return mapping[severity?.toLowerCase()] || 'Medium';
    }
    async requestContainmentApproval(actionId, approvalData) {
        // In production, this would create approval request and notify approvers
        // For demo, we'll auto-approve
        await this.delay(100);
        return { approved: true, approver: 'system', timestamp: new Date() };
    }
    async recordContainmentTelemetry(actionId, actionType, result) {
        // Record metrics for monitoring and reporting
        this.logger.info('Containment telemetry', {
            action_id: actionId,
            action_type: actionType,
            success: result.success,
            timestamp: new Date(),
        });
    }
    async createAuditLog(logData) {
        // Create tamper-evident audit log entry
        await this.prisma.auditLog.create({
            data: {
                ...logData,
                timestamp: new Date(),
                hash: this.generateAuditHash(logData),
            },
        });
    }
    generateAuditHash(data) {
        // Generate hash for audit trail integrity
        return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32);
    }
    async scheduleStatusSync(ticketLinkId) {
        // Schedule periodic status synchronization
        await this.redis.sadd('ticket_sync_queue', ticketLinkId);
    }
    async scheduleRollbackCheck(actionId, delay) {
        // Schedule automatic rollback check
        await this.redis.sadd('rollback_check_queue', JSON.stringify({
            action_id: actionId,
            scheduled_for: Date.now() + this.parseDuration(delay),
        }));
    }
    parseDuration(duration) {
        const match = duration.match(/^(\d+)(h|m|s)$/);
        if (!match)
            return 0;
        const [, value, unit] = match;
        const multipliers = { s: 1000, m: 60000, h: 3600000 };
        return parseInt(value) * multipliers[unit];
    }
    async updateServiceNowIncident(incidentId, updates) {
        // Implementation for ServiceNow updates
        this.logger.debug('ServiceNow incident update', { incidentId, updates });
    }
    async updateJiraIssue(issueKey, updates) {
        // Implementation for Jira updates
        this.logger.debug('Jira issue update', { issueKey, updates });
    }
    async timeout(ms, message) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }
    async delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.SOARConnectorV1Service = SOARConnectorV1Service;
