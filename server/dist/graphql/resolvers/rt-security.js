import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';
import { pubsub } from '../pubsub';
import { Logger } from '../../config/logger';
import { createHash } from 'crypto';
import { ProvenanceRepo } from '../../repos/ProvenanceRepo.js';
import { preflightAgentPlan } from '../../services/AgentSafetyService.js';
import { agentPolicyDenialsTotal } from '../../monitoring/metrics.js';
import { PendingAgentActionRepo } from '../../repos/PendingAgentActionRepo.js';
const logger = Logger.getLogger('rt-security-resolvers');
// Event types for real-time subscriptions
const RT_SECURITY_EVENTS = {
    DETECTION_ALERT_CREATED: 'DETECTION_ALERT_CREATED',
    DETECTION_ALERT_UPDATED: 'DETECTION_ALERT_UPDATED',
    INCIDENT_CREATED: 'INCIDENT_CREATED',
    INCIDENT_UPDATED: 'INCIDENT_UPDATED',
    SOAR_ACTION_STARTED: 'SOAR_ACTION_STARTED',
    SOAR_ACTION_COMPLETED: 'SOAR_ACTION_COMPLETED',
    PLAYBOOK_EXECUTED: 'PLAYBOOK_EXECUTED',
};
// RBAC permission checks
const checkRTSecurityPermissions = (context, action, resource) => {
    if (!context.user) {
        throw new AuthenticationError('Authentication required');
    }
    const requiredPermissions = {
        'detection:read': ['analyst', 'investigator', 'admin'],
        'detection:write': ['investigator', 'admin'],
        'incident:read': ['analyst', 'investigator', 'admin'],
        'incident:write': ['investigator', 'admin'],
        'soar:read': ['analyst', 'investigator', 'admin'],
        'soar:execute': ['investigator', 'admin'],
        'playbook:read': ['analyst', 'investigator', 'admin'],
        'playbook:write': ['investigator', 'admin'],
    };
    const userRoles = context.user.roles || [];
    const allowedRoles = requiredPermissions[action] || [];
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));
    if (!hasPermission) {
        logger.warn(`RBAC: Access denied for user ${context.user.id} to ${action}`, {
            userId: context.user.id,
            action,
            userRoles,
            requiredRoles: allowedRoles,
            resource
        });
        throw new ForbiddenError(`Insufficient permissions for ${action}`);
    }
    logger.debug(`RBAC: Access granted for user ${context.user.id} to ${action}`, {
        userId: context.user.id,
        action,
        resource
    });
};
// Tenant isolation check
const checkTenantAccess = (context, tenantId) => {
    if (!context.user?.tenantId || context.user.tenantId !== tenantId) {
        throw new ForbiddenError('Tenant access denied');
    }
};
export const rtSecurityResolvers = {
    Query: {
        // Detection Rules
        async detectionRules(parent, args, context) {
            checkRTSecurityPermissions(context, 'detection:read');
            const { status, rule_type, severity, tenant_id, limit = 50, offset = 0 } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT * FROM detection_rules 
        WHERE tenant_id = $1
        ${status ? 'AND status = $2' : ''}
        ${rule_type ? 'AND rule_type = $3' : ''}
        ${severity ? 'AND severity = $4' : ''}
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
      `;
            const params = [userTenantId];
            let paramIndex = 2;
            if (status)
                params.push(status);
            if (rule_type)
                params.push(rule_type);
            if (severity)
                params.push(severity);
            params.push(limit, offset);
            const result = await context.db.query(query, params);
            logger.info(`Retrieved ${result.rows.length} detection rules`, {
                userId: context.user.id,
                tenantId: userTenantId,
                filters: { status, rule_type, severity }
            });
            return result.rows;
        },
        async detectionRule(parent, args, context) {
            checkRTSecurityPermissions(context, 'detection:read');
            const query = `
        SELECT * FROM detection_rules 
        WHERE id = $1 AND tenant_id = $2
      `;
            const result = await context.db.query(query, [args.id, context.user?.tenantId]);
            if (result.rows.length === 0) {
                throw new UserInputError('Detection rule not found');
            }
            return result.rows[0];
        },
        // Detection Alerts
        async detectionAlerts(parent, args, context) {
            checkRTSecurityPermissions(context, 'detection:read');
            const { rule_id, status, severity, start_time, end_time, tenant_id, limit = 50, offset = 0 } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT da.*, dr.name as rule_name, dr.rule_type
        FROM detection_alerts da
        JOIN detection_rules dr ON dr.id = da.rule_id
        WHERE da.tenant_id = $1
        ${rule_id ? 'AND da.rule_id = $2' : ''}
        ${status ? 'AND da.status = $3' : ''}
        ${severity ? 'AND da.severity = $4' : ''}
        ${start_time ? 'AND da.created_at >= $5' : ''}
        ${end_time ? 'AND da.created_at <= $6' : ''}
        ORDER BY da.created_at DESC
        LIMIT $7 OFFSET $8
      `;
            const params = [userTenantId];
            let paramIndex = 2;
            if (rule_id)
                params.push(rule_id);
            if (status)
                params.push(status);
            if (severity)
                params.push(severity);
            if (start_time)
                params.push(start_time);
            if (end_time)
                params.push(end_time);
            params.push(limit, offset);
            const result = await context.db.query(query, params);
            logger.info(`Retrieved ${result.rows.length} detection alerts`, {
                userId: context.user.id,
                tenantId: userTenantId,
                filters: { rule_id, status, severity, start_time, end_time }
            });
            return result.rows;
        },
        // Incidents
        async incidents(parent, args, context) {
            checkRTSecurityPermissions(context, 'incident:read');
            const { status, severity, priority, category, assigned_to, tenant_id, limit = 50, offset = 0 } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT i.*, 
               COUNT(ia.alert_id) as alert_count,
               COUNT(sa.id) as action_count
        FROM incidents i
        LEFT JOIN incident_alerts ia ON ia.incident_id = i.id
        LEFT JOIN soar_actions sa ON sa.incident_id = i.id
        WHERE i.tenant_id = $1
        ${status ? 'AND i.status = $2' : ''}
        ${severity ? 'AND i.severity = $3' : ''}
        ${priority ? 'AND i.priority = $4' : ''}
        ${category ? 'AND i.category = $5' : ''}
        ${assigned_to ? 'AND i.assigned_to = $6' : ''}
        GROUP BY i.id
        ORDER BY i.created_at DESC
        LIMIT $7 OFFSET $8
      `;
            const params = [userTenantId];
            let paramIndex = 2;
            if (status)
                params.push(status);
            if (severity)
                params.push(severity);
            if (priority)
                params.push(priority);
            if (category)
                params.push(category);
            if (assigned_to)
                params.push(assigned_to);
            params.push(limit, offset);
            const result = await context.db.query(query, params);
            return result.rows;
        },
        // Playbooks
        async playbooks(parent, args, context) {
            checkRTSecurityPermissions(context, 'playbook:read');
            const { category, status, tenant_id } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT p.*, 
               COUNT(pa.id) as action_count,
               AVG(pe.success_rate) as avg_success_rate
        FROM playbooks p
        LEFT JOIN playbook_actions pa ON pa.playbook_id = p.id
        LEFT JOIN playbook_executions pe ON pe.playbook_id = p.id
        WHERE p.tenant_id = $1
        ${category ? 'AND p.category = $2' : ''}
        ${status ? 'AND p.status = $3' : ''}
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
            const params = [userTenantId];
            if (category)
                params.push(category);
            if (status)
                params.push(status);
            const result = await context.db.query(query, params);
            return result.rows;
        },
        // SOAR Actions
        async soarActions(parent, args, context) {
            checkRTSecurityPermissions(context, 'soar:read');
            const { incident_id, playbook_id, status, action_type, tenant_id } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT sa.*, p.name as playbook_name, i.title as incident_title
        FROM soar_actions sa
        LEFT JOIN playbooks p ON p.id = sa.playbook_id
        LEFT JOIN incidents i ON i.id = sa.incident_id
        WHERE sa.tenant_id = $1
        ${incident_id ? 'AND sa.incident_id = $2' : ''}
        ${playbook_id ? 'AND sa.playbook_id = $3' : ''}
        ${status ? 'AND sa.status = $4' : ''}
        ${action_type ? 'AND sa.action_type = $5' : ''}
        ORDER BY sa.created_at DESC
      `;
            const params = [userTenantId];
            if (incident_id)
                params.push(incident_id);
            if (playbook_id)
                params.push(playbook_id);
            if (status)
                params.push(status);
            if (action_type)
                params.push(action_type);
            const result = await context.db.query(query, params);
            return result.rows;
        },
    },
    Mutation: {
        // Create Detection Rule
        async createDetectionRule(parent, args, context) {
            checkRTSecurityPermissions(context, 'detection:write');
            const { input } = args;
            const tenantId = input.tenant_id || context.user?.tenantId;
            checkTenantAccess(context, tenantId);
            const query = `
        INSERT INTO detection_rules (
          name, rule_type, logic, severity, status, mitre_techniques,
          false_positive_rate, detection_rate, description, tenant_id, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
            const values = [
                input.name,
                input.rule_type,
                input.logic,
                input.severity,
                input.status || 'draft',
                input.mitre_techniques || [],
                input.false_positive_rate || 0,
                input.detection_rate || 0,
                input.description,
                tenantId,
                context.user?.id
            ];
            const result = await context.db.query(query, values);
            const newRule = result.rows[0];
            logger.info(`Created detection rule: ${newRule.name}`, {
                ruleId: newRule.id,
                userId: context.user.id,
                tenantId
            });
            return newRule;
        },
        // Create Detection Alert (typically called by detection engine)
        async createDetectionAlert(parent, args, context) {
            checkRTSecurityPermissions(context, 'detection:write');
            const { input } = args;
            const tenantId = input.tenant_id || context.user?.tenantId;
            checkTenantAccess(context, tenantId);
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Create the alert
                const alertQuery = `
          INSERT INTO detection_alerts (
            rule_id, severity, confidence, title, description, raw_data,
            source_ip, destination_ip, tenant_id, created_by, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
                const alertValues = [
                    input.rule_id,
                    input.severity,
                    input.confidence,
                    input.title,
                    input.description,
                    JSON.stringify(input.raw_data || {}),
                    input.source_ip,
                    input.destination_ip,
                    tenantId,
                    context.user?.id,
                    'open'
                ];
                const alertResult = await client.query(alertQuery, alertValues);
                const newAlert = alertResult.rows[0];
                // Check if alert should auto-escalate to incident
                const ruleQuery = `
          SELECT * FROM detection_rules WHERE id = $1 AND tenant_id = $2
        `;
                const ruleResult = await client.query(ruleQuery, [input.rule_id, tenantId]);
                const rule = ruleResult.rows[0];
                let incident = null;
                // Auto-escalate high/critical severity alerts
                if (rule && (newAlert.severity === 'high' || newAlert.severity === 'critical')) {
                    const incidentQuery = `
            INSERT INTO incidents (
              title, description, severity, priority, status, category,
              tenant_id, created_by, impact_score, estimated_resolution_time
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
          `;
                    const incidentValues = [
                        `Incident: ${newAlert.title}`,
                        `Auto-escalated from alert: ${newAlert.description}`,
                        newAlert.severity,
                        newAlert.severity === 'critical' ? 'critical' : 'high',
                        'investigating',
                        'security',
                        tenantId,
                        context.user?.id,
                        newAlert.severity === 'critical' ? 90 : 70,
                        newAlert.severity === 'critical' ? '4 hours' : '8 hours'
                    ];
                    const incidentResult = await client.query(incidentQuery, incidentValues);
                    incident = incidentResult.rows[0];
                    // Link alert to incident
                    await client.query('INSERT INTO incident_alerts (incident_id, alert_id, created_at) VALUES ($1, $2, NOW())', [incident.id, newAlert.id]);
                    logger.info(`Auto-escalated alert to incident`, {
                        alertId: newAlert.id,
                        incidentId: incident.id,
                        severity: newAlert.severity
                    });
                    // Publish incident creation event
                    pubsub.publish(RT_SECURITY_EVENTS.INCIDENT_CREATED, {
                        incidentCreated: incident,
                        tenantId
                    });
                }
                await client.query('COMMIT');
                // Publish alert creation event
                pubsub.publish(RT_SECURITY_EVENTS.DETECTION_ALERT_CREATED, {
                    detectionAlertCreated: newAlert,
                    tenantId
                });
                logger.info(`Created detection alert: ${newAlert.title}`, {
                    alertId: newAlert.id,
                    ruleId: input.rule_id,
                    severity: newAlert.severity,
                    autoEscalated: !!incident
                });
                return {
                    alert: newAlert,
                    incident,
                    autoEscalated: !!incident
                };
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger.error('Failed to create detection alert', error);
                throw error;
            }
            finally {
                client.release();
            }
        },
        // Create Incident
        async createIncident(parent, args, context) {
            checkRTSecurityPermissions(context, 'incident:write');
            const { input } = args;
            const tenantId = input.tenant_id || context.user?.tenantId;
            checkTenantAccess(context, tenantId);
            const query = `
        INSERT INTO incidents (
          title, description, severity, priority, status, category,
          assigned_to, sla_deadline, impact_score, estimated_resolution_time,
          tenant_id, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
            const values = [
                input.title,
                input.description,
                input.severity,
                input.priority,
                input.status || 'open',
                input.category,
                input.assigned_to,
                input.sla_deadline,
                input.impact_score,
                input.estimated_resolution_time,
                tenantId,
                context.user?.id
            ];
            const result = await context.db.query(query, values);
            const newIncident = result.rows[0];
            // Publish incident creation event
            pubsub.publish(RT_SECURITY_EVENTS.INCIDENT_CREATED, {
                incidentCreated: newIncident,
                tenantId
            });
            logger.info(`Created incident: ${newIncident.title}`, {
                incidentId: newIncident.id,
                severity: newIncident.severity,
                priority: newIncident.priority
            });
            return newIncident;
        },
        // Execute SOAR Action
        async executeSOARAction(parent, args, context) {
            checkRTSecurityPermissions(context, 'soar:execute');
            const { input } = args;
            const tenantId = input.tenant_id || context.user?.tenantId;
            checkTenantAccess(context, tenantId);
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Create the SOAR action
                const actionQuery = `
          INSERT INTO soar_actions (
            name, action_type, status, priority, playbook_id, incident_id,
            parameters, timeout_seconds, tenant_id, created_by, scheduled_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
                const actionValues = [
                    input.name,
                    input.action_type,
                    'pending',
                    input.priority || 'medium',
                    input.playbook_id,
                    input.incident_id,
                    JSON.stringify(input.parameters || {}),
                    input.timeout_seconds || 300,
                    tenantId,
                    context.user?.id,
                    input.scheduled_at || new Date().toISOString()
                ];
                const actionResult = await client.query(actionQuery, actionValues);
                const newAction = actionResult.rows[0];
                // Update incident with new action
                if (input.incident_id) {
                    await client.query('UPDATE incidents SET updated_at = NOW() WHERE id = $1', [input.incident_id]);
                }
                await client.query('COMMIT');
                // Record policy provenance (gate passed)
                try {
                    const prov = new ProvenanceRepo(context.db);
                    await prov.record({
                        kind: 'policy',
                        hash: createHash('sha256').update(JSON.stringify({
                            actionType: input.action_type,
                            parameters: input.parameters || {}
                        })).digest('hex'),
                        incidentId: input.incident_id
                    });
                }
                catch { }
                // Agent Safety preflight: dual-control enforcement without execution
                try {
                    const pre = await preflightAgentPlan({
                        id: String(newAction.id),
                        sensitivity: (input.sensitivity || 'MEDIUM').toUpperCase(),
                        model_artifacts: input.model_artifacts || []
                    }, context);
                    if (pre.requiresDualControl) {
                        // Record pending approval provenance
                        const prov = new ProvenanceRepo(context.db);
                        await prov.record({
                            kind: 'policy',
                            hash: createHash('sha256').update('dual-control').digest('hex'),
                            incidentId: input.incident_id
                        });
                        try {
                            (await import('../../monitoring/opentelemetry.js')).default.addSpanEvent('safety.dual_control_required', { action: input.action_type });
                        }
                        catch { }
                        // Persist pending action for approvals resume
                        const pendingRepo = new PendingAgentActionRepo(context.db);
                        await pendingRepo.create({
                            incidentId: input.incident_id,
                            tenantId: tenantId,
                            createdBy: context.user?.id,
                            plan: {
                                playbook: String(input.playbook_id || input.action_type),
                                parameters: input.parameters || {},
                                sensitivity: (input.sensitivity || 'MEDIUM').toUpperCase(),
                                model_artifacts: input.model_artifacts || [],
                            }
                        });
                        logger.info('SOAR action awaiting dual-control approval', { actionId: newAction.id });
                        return newAction; // Do not start execution yet
                    }
                }
                catch (e) {
                    agentPolicyDenialsTotal.inc({ tenant: tenantId, action: input.action_type, reason: e?.code || 'preflight_failed' });
                    try {
                        (await import('../../monitoring/opentelemetry.js')).default.addSpanEvent('safety.policy_denied', { action: input.action_type, reason: e?.code || 'preflight_failed' });
                    }
                    catch { }
                    const { GraphQLError } = await import('graphql');
                    const { ConfigService } = await import('../../services/ConfigService.js');
                    const appealUrl = ConfigService.ombudsUrl();
                    throw new GraphQLError('Action denied by safety policy', { extensions: { code: 'FORBIDDEN', reason: e?.message || 'preflight_failed', appealUrl: appealUrl || null } });
                }
                // Publish SOAR action started event
                pubsub.publish(RT_SECURITY_EVENTS.SOAR_ACTION_STARTED, {
                    soarActionStarted: newAction,
                    tenantId
                });
                // Start action execution asynchronously
                setImmediate(async () => {
                    await executeSOARActionAsync(newAction, context);
                });
                logger.info(`Scheduled SOAR action: ${newAction.name}`, {
                    actionId: newAction.id,
                    actionType: newAction.action_type,
                    incidentId: input.incident_id,
                    playbookId: input.playbook_id
                });
                return newAction;
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger.error('Failed to execute SOAR action', error);
                throw error;
            }
            finally {
                client.release();
            }
        },
        // Execute Playbook
        async executePlaybook(parent, args, context) {
            checkRTSecurityPermissions(context, 'soar:execute');
            const { input } = args;
            const tenantId = input.tenant_id || context.user?.tenantId;
            checkTenantAccess(context, tenantId);
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Get playbook and its actions
                const playbookQuery = `
          SELECT p.*, 
                 json_agg(pa.*) as actions
          FROM playbooks p
          LEFT JOIN playbook_actions pa ON pa.playbook_id = p.id
          WHERE p.id = $1 AND p.tenant_id = $2 AND p.status = 'active'
          GROUP BY p.id
        `;
                const playbookResult = await client.query(playbookQuery, [input.playbook_id, tenantId]);
                if (playbookResult.rows.length === 0) {
                    throw new UserInputError('Playbook not found or not active');
                }
                const playbook = playbookResult.rows[0];
                // Create playbook execution record
                const executionQuery = `
          INSERT INTO playbook_executions (
            playbook_id, incident_id, status, tenant_id, executed_by, parameters
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
                const executionValues = [
                    input.playbook_id,
                    input.incident_id,
                    'running',
                    tenantId,
                    context.user?.id,
                    JSON.stringify(input.parameters || {})
                ];
                const executionResult = await client.query(executionQuery, executionValues);
                const execution = executionResult.rows[0];
                // Create SOAR actions for each playbook action
                const actions = playbook.actions.filter(a => a !== null);
                const soarActions = [];
                for (const action of actions) {
                    const soarActionQuery = `
            INSERT INTO soar_actions (
              name, action_type, status, priority, playbook_id, incident_id,
              execution_id, parameters, timeout_seconds, tenant_id, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
          `;
                    const soarActionValues = [
                        action.name,
                        action.action_type,
                        'pending',
                        action.priority || 'medium',
                        input.playbook_id,
                        input.incident_id,
                        execution.id,
                        JSON.stringify(action.parameters || {}),
                        action.timeout_seconds || 300,
                        tenantId,
                        context.user?.id
                    ];
                    const soarActionResult = await client.query(soarActionQuery, soarActionValues);
                    soarActions.push(soarActionResult.rows[0]);
                }
                await client.query('COMMIT');
                // Publish playbook execution event
                pubsub.publish(RT_SECURITY_EVENTS.PLAYBOOK_EXECUTED, {
                    playbookExecuted: {
                        execution,
                        playbook,
                        actions: soarActions
                    },
                    tenantId
                });
                // Execute actions asynchronously
                setImmediate(async () => {
                    for (const action of soarActions) {
                        await executeSOARActionAsync(action, context);
                    }
                });
                logger.info(`Executed playbook: ${playbook.name}`, {
                    playbookId: input.playbook_id,
                    executionId: execution.id,
                    actionCount: soarActions.length,
                    incidentId: input.incident_id
                });
                return {
                    execution,
                    playbook,
                    actions: soarActions
                };
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger.error('Failed to execute playbook', error);
                throw error;
            }
            finally {
                client.release();
            }
        },
    },
    Subscription: {
        // Real-time detection alerts
        detectionAlertUpdates: {
            subscribe: withFilter(() => pubsub.asyncIterator([
                RT_SECURITY_EVENTS.DETECTION_ALERT_CREATED,
                RT_SECURITY_EVENTS.DETECTION_ALERT_UPDATED
            ]), (payload, variables, context) => {
                // Check tenant access and permissions
                if (!context.user)
                    return false;
                try {
                    checkRTSecurityPermissions(context, 'detection:read');
                    const alertTenantId = payload.tenantId || payload.detectionAlertCreated?.tenant_id || payload.detectionAlertUpdated?.tenant_id;
                    checkTenantAccess(context, alertTenantId);
                    // Optional filtering by rule_id
                    if (variables.rule_id) {
                        const alert = payload.detectionAlertCreated || payload.detectionAlertUpdated;
                        return alert && alert.rule_id === variables.rule_id;
                    }
                    return true;
                }
                catch (error) {
                    logger.debug('Subscription access denied', {
                        userId: context.user?.id,
                        error: error.message
                    });
                    return false;
                }
            }),
        },
        // Real-time incident updates
        incidentUpdates: {
            subscribe: withFilter(() => pubsub.asyncIterator([
                RT_SECURITY_EVENTS.INCIDENT_CREATED,
                RT_SECURITY_EVENTS.INCIDENT_UPDATED
            ]), (payload, variables, context) => {
                if (!context.user)
                    return false;
                try {
                    checkRTSecurityPermissions(context, 'incident:read');
                    const incidentTenantId = payload.tenantId || payload.incidentCreated?.tenant_id || payload.incidentUpdated?.tenant_id;
                    checkTenantAccess(context, incidentTenantId);
                    // Optional filtering by assigned_to
                    if (variables.assigned_to) {
                        const incident = payload.incidentCreated || payload.incidentUpdated;
                        return incident && incident.assigned_to === variables.assigned_to;
                    }
                    return true;
                }
                catch (error) {
                    return false;
                }
            }),
        },
        // Real-time SOAR action updates
        soarActionUpdates: {
            subscribe: withFilter(() => pubsub.asyncIterator([
                RT_SECURITY_EVENTS.SOAR_ACTION_STARTED,
                RT_SECURITY_EVENTS.SOAR_ACTION_COMPLETED
            ]), (payload, variables, context) => {
                if (!context.user)
                    return false;
                try {
                    checkRTSecurityPermissions(context, 'soar:read');
                    const actionTenantId = payload.tenantId;
                    checkTenantAccess(context, actionTenantId);
                    // Optional filtering by incident_id
                    if (variables.incident_id) {
                        const action = payload.soarActionStarted || payload.soarActionCompleted;
                        return action && action.incident_id === variables.incident_id;
                    }
                    return true;
                }
                catch (error) {
                    return false;
                }
            }),
        },
    },
    // Field resolvers for complex relationships
    DetectionAlert: {
        async rule(parent, args, context) {
            const query = `SELECT * FROM detection_rules WHERE id = $1`;
            const result = await context.db.query(query, [parent.rule_id]);
            return result.rows[0];
        },
        async incidents(parent, args, context) {
            const query = `
        SELECT i.* FROM incidents i
        JOIN incident_alerts ia ON ia.incident_id = i.id
        WHERE ia.alert_id = $1
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
    },
    Incident: {
        async alerts(parent, args, context) {
            const query = `
        SELECT da.* FROM detection_alerts da
        JOIN incident_alerts ia ON ia.alert_id = da.id
        WHERE ia.incident_id = $1
        ORDER BY da.created_at DESC
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
        async actions(parent, args, context) {
            const query = `
        SELECT * FROM soar_actions 
        WHERE incident_id = $1 
        ORDER BY created_at DESC
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
        async playbooks(parent, args, context) {
            const query = `
        SELECT DISTINCT p.* FROM playbooks p
        JOIN soar_actions sa ON sa.playbook_id = p.id
        WHERE sa.incident_id = $1
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
    },
    SOARAction: {
        async incident(parent, args, context) {
            if (!parent.incident_id)
                return null;
            const query = `SELECT * FROM incidents WHERE id = $1`;
            const result = await context.db.query(query, [parent.incident_id]);
            return result.rows[0];
        },
        async playbook(parent, args, context) {
            if (!parent.playbook_id)
                return null;
            const query = `SELECT * FROM playbooks WHERE id = $1`;
            const result = await context.db.query(query, [parent.playbook_id]);
            return result.rows[0];
        },
    },
    Playbook: {
        async actions(parent, args, context) {
            const query = `
        SELECT * FROM playbook_actions 
        WHERE playbook_id = $1 
        ORDER BY execution_order ASC
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
        async executions(parent, args, context) {
            const query = `
        SELECT * FROM playbook_executions 
        WHERE playbook_id = $1 
        ORDER BY created_at DESC
        LIMIT 10
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
    },
};
// Async SOAR action execution function
async function executeSOARActionAsync(action, context) {
    const logger = Logger.getLogger('soar-executor');
    try {
        // Record action start provenance
        try {
            const prov = new ProvenanceRepo(context.db);
            await prov.record({
                kind: 'action',
                hash: createHash('sha256').update(JSON.stringify({ started: true, actionId: action.id })).digest('hex'),
                incidentId: action.incident_id
            });
        }
        catch { }
        // Update status to running
        await context.db.query('UPDATE soar_actions SET status = $1, started_at = NOW() WHERE id = $2', ['running', action.id]);
        logger.info(`Starting SOAR action execution: ${action.name}`, {
            actionId: action.id,
            actionType: action.action_type
        });
        // Simulate action execution based on type
        let success = true;
        let result = {};
        switch (action.action_type) {
            case 'isolation':
                // Simulate endpoint isolation
                result = { isolated: true, endpoint: action.parameters?.endpoint };
                break;
            case 'block_ip':
                // Simulate IP blocking
                result = { blocked: true, ip: action.parameters?.ip };
                break;
            case 'quarantine_file':
                // Simulate file quarantine
                result = { quarantined: true, file: action.parameters?.file };
                break;
            case 'email_notification':
                // Simulate email notification
                result = { sent: true, recipients: action.parameters?.recipients };
                break;
            default:
                result = { executed: true, message: 'Generic action completed' };
        }
        // Add realistic delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 1000));
        // Update with completion
        await context.db.query(`UPDATE soar_actions 
       SET status = $1, completed_at = NOW(), result = $2, retry_count = retry_count + 1 
       WHERE id = $3`, [success ? 'completed' : 'failed', JSON.stringify(result), action.id]);
        // Publish completion event
        pubsub.publish(RT_SECURITY_EVENTS.SOAR_ACTION_COMPLETED, {
            soarActionCompleted: {
                ...action,
                status: success ? 'completed' : 'failed',
                result,
                completed_at: new Date().toISOString()
            },
            tenantId: action.tenant_id
        });
        // Record action completion provenance
        try {
            const prov = new ProvenanceRepo(context.db);
            await prov.record({
                kind: 'action',
                hash: createHash('sha256').update(JSON.stringify(result)).digest('hex'),
                incidentId: action.incident_id
            });
        }
        catch { }
        logger.info(`Completed SOAR action: ${action.name}`, {
            actionId: action.id,
            success,
            result
        });
    }
    catch (error) {
        logger.error(`Failed to execute SOAR action: ${action.name}`, {
            actionId: action.id,
            error: error.message
        });
        // Update with failure
        await context.db.query(`UPDATE soar_actions 
       SET status = $1, completed_at = NOW(), result = $2, retry_count = retry_count + 1 
       WHERE id = $3`, ['failed', JSON.stringify({ error: error.message }), action.id]);
        // Retry if under max retries
        if (action.retry_count < (action.max_retries || 3)) {
            setTimeout(async () => {
                await executeSOARActionAsync(action, context);
            }, Math.pow(2, action.retry_count) * 1000); // Exponential backoff
        }
    }
}
//# sourceMappingURL=rt-security.js.map