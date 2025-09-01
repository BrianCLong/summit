import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';
import { pubsub } from '../pubsub';
import { Logger } from '../../config/logger';
import { LegalComplianceValidator, SecurityAuditLogger, TenantIsolationValidator, DataClassificationHandler, ExportControlValidator, SecurityClassification, CryptoRiskLevel } from '../middleware/security-guardrails';
const logger = Logger.getLogger('crypto-resolvers');
// Event types for Crypto subscriptions
const CRYPTO_EVENTS = {
    CRYPTO_ANALYSIS_CREATED: 'CRYPTO_ANALYSIS_CREATED',
    CRYPTO_ANALYSIS_UPDATED: 'CRYPTO_ANALYSIS_UPDATED',
    CRYPTO_ANALYSIS_COMPLETED: 'CRYPTO_ANALYSIS_COMPLETED',
    CRYPTO_APPROVAL_REQUESTED: 'CRYPTO_APPROVAL_REQUESTED',
    CRYPTO_APPROVAL_GRANTED: 'CRYPTO_APPROVAL_GRANTED',
    HSM_OPERATION_COMPLETED: 'HSM_OPERATION_COMPLETED',
    CRYPTO_SECURITY_ALERT: 'CRYPTO_SECURITY_ALERT',
    KEY_MATERIAL_ACCESSED: 'KEY_MATERIAL_ACCESSED',
};
// RBAC permission checks
const checkCryptoPermissions = (context, action, resource) => {
    if (!context.user) {
        throw new AuthenticationError('Authentication required');
    }
    const requiredPermissions = {
        'crypto:read': ['crypto_analyst', 'senior_analyst', 'admin'],
        'crypto:write': ['crypto_analyst', 'admin'],
        'crypto:analyze': ['crypto_analyst', 'senior_analyst', 'admin'],
        'crypto:approve': ['senior_analyst', 'admin'],
        'crypto:key_recovery': ['crypto_analyst', 'admin'],
        'crypto:plaintext_access': ['crypto_analyst', 'admin'],
        'crypto:export': ['admin'],
        'crypto:hsm': ['crypto_analyst', 'admin'],
        'crypto:tools': ['crypto_analyst', 'admin'],
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
};
// Tenant isolation check
const checkTenantAccess = (context, tenantId) => {
    if (!context.user?.tenantId || context.user.tenantId !== tenantId) {
        throw new ForbiddenError('Tenant access denied');
    }
};
export const cryptoResolvers = {
    Query: {
        // Crypto Analyses
        async cryptoAnalyses(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:read');
            const { status, type, priority, classification, tenant_id, limit = 50, offset = 0 } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT ca.*, 
               COUNT(cap.id) as approval_count,
               COUNT(cae.id) as audit_entries
        FROM crypto_analyses ca
        LEFT JOIN crypto_approvals cap ON cap.analysis_id = ca.id
        LEFT JOIN crypto_audit_entries cae ON cae.analysis_id = ca.id
        WHERE ca.tenant_id = $1
        ${status ? 'AND ca.status = $2' : ''}
        ${type ? 'AND ca.type = $3' : ''}
        ${priority ? 'AND ca.priority = $4' : ''}
        ${classification ? 'AND ca.classification = $5' : ''}
        GROUP BY ca.id
        ORDER BY ca.created_at DESC
        LIMIT $6 OFFSET $7
      `;
            const params = [userTenantId];
            let paramIndex = 2;
            if (status)
                params.push(status);
            if (type)
                params.push(type);
            if (priority)
                params.push(priority);
            if (classification)
                params.push(classification);
            params.push(limit, offset);
            const result = await context.db.query(query, params);
            // Filter results based on user clearance
            const userClearance = context.user?.security_clearance || 1;
            const filteredResults = await Promise.all(result.rows.map(async (analysis) => {
                return await DataClassificationHandler.enforceDataHandling(analysis, analysis.classification, userClearance, context.db);
            }));
            logger.info(`Retrieved ${filteredResults.length} crypto analyses`, {
                userId: context.user.id,
                tenantId: userTenantId,
                filters: { status, type, priority, classification }
            });
            return filteredResults;
        },
        async cryptoAnalysis(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:read');
            const query = `
        SELECT ca.*, 
               COUNT(cap.id) as approval_count
        FROM crypto_analyses ca
        LEFT JOIN crypto_approvals cap ON cap.analysis_id = ca.id
        WHERE ca.id = $1 AND ca.tenant_id = $2
        GROUP BY ca.id
      `;
            const result = await context.db.query(query, [args.id, context.user?.tenantId]);
            if (result.rows.length === 0) {
                throw new UserInputError('Crypto analysis not found');
            }
            const analysis = result.rows[0];
            // Apply data classification filtering
            const userClearance = context.user?.security_clearance || 1;
            const filteredAnalysis = await DataClassificationHandler.enforceDataHandling(analysis, analysis.classification, userClearance, context.db);
            return filteredAnalysis;
        },
        // Crypto Tools
        async cryptoTools(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:tools');
            const { category, enabled, tenant_id } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT ct.*,
               COUNT(ca.id) as usage_count,
               AVG(ca.confidence_score) as avg_success_score
        FROM crypto_tools ct
        LEFT JOIN crypto_analyses ca ON ca.algorithm_detected = ANY(ct.algorithms_supported)
        WHERE ct.tenant_id = $1
        ${category ? 'AND ct.category = $2' : ''}
        ${enabled !== undefined ? 'AND ct.enabled = $3' : ''}
        GROUP BY ct.id
        ORDER BY ct.last_used DESC NULLS LAST
      `;
            const params = [userTenantId];
            if (category)
                params.push(category);
            if (enabled !== undefined)
                params.push(enabled);
            const result = await context.db.query(query, params);
            return result.rows;
        },
        // Crypto Approvals
        async cryptoApprovals(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:approve');
            const { status, request_type, tenant_id } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT cap.*, ca.name as analysis_name, ca.type as analysis_type
        FROM crypto_approvals cap
        JOIN crypto_analyses ca ON ca.id = cap.analysis_id
        WHERE cap.analysis_id IN (
          SELECT id FROM crypto_analyses WHERE tenant_id = $1
        )
        ${status ? 'AND cap.status = $2' : ''}
        ${request_type ? 'AND cap.request_type = $3' : ''}
        ORDER BY cap.requested_at DESC
      `;
            const params = [userTenantId];
            if (status)
                params.push(status);
            if (request_type)
                params.push(request_type);
            const result = await context.db.query(query, params);
            return result.rows;
        },
        // HSM Operations
        async hsmOperations(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:hsm');
            const { operation, status, tenant_id } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT ho.*,
               COUNT(hae.id) as audit_entries
        FROM hsm_operations ho
        LEFT JOIN hsm_audit_entries hae ON hae.operation_id = ho.id
        WHERE ho.tenant_id = $1
        ${operation ? 'AND ho.operation = $2' : ''}
        ${status ? 'AND ho.status = $3' : ''}
        GROUP BY ho.id
        ORDER BY ho.created_at DESC
        LIMIT 100
      `;
            const params = [userTenantId];
            if (operation)
                params.push(operation);
            if (status)
                params.push(status);
            const result = await context.db.query(query, params);
            return result.rows;
        },
        // Crypto Audit Log
        async cryptoAuditLog(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:read');
            const { analysis_id, user_id, action, since, tenant_id, limit = 1000 } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT cae.*
        FROM crypto_audit_entries cae
        WHERE (
          cae.analysis_id IS NULL OR 
          cae.analysis_id IN (
            SELECT id FROM crypto_analyses WHERE tenant_id = $1
          )
        )
        ${analysis_id ? 'AND cae.analysis_id = $2' : ''}
        ${user_id ? 'AND cae.user_id = $3' : ''}
        ${action ? 'AND cae.action = $4' : ''}
        ${since ? 'AND cae.timestamp >= $5' : ''}
        ORDER BY cae.timestamp DESC
        LIMIT $6
      `;
            const params = [userTenantId];
            if (analysis_id)
                params.push(analysis_id);
            if (user_id)
                params.push(user_id);
            if (action)
                params.push(action);
            if (since)
                params.push(since);
            params.push(limit);
            const result = await context.db.query(query, params);
            return result.rows;
        },
    },
    Mutation: {
        // Create Crypto Analysis (with security validation)
        async createCryptoAnalysis(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:analyze');
            const { input } = args;
            const tenantId = input.tenant_id || context.user?.tenantId;
            checkTenantAccess(context, tenantId);
            // Validate crypto operation compliance
            const validation = await LegalComplianceValidator.validateCryptoOperation(input, context.user, tenantId, context.db);
            if (!validation.allowed) {
                logger.warn('Crypto analysis creation blocked by security guardrails', {
                    userId: context.user.id,
                    reasons: validation.reasons,
                    riskLevel: validation.riskLevel
                });
                throw new ForbiddenError(`Crypto analysis denied: ${validation.reasons.join(', ')}`);
            }
            // Check export control restrictions
            const exportValidation = await ExportControlValidator.validateExportOperation(input, context.user?.location || 'US', input.target_location);
            if (!exportValidation.allowed) {
                throw new ForbiddenError(`Export control violation: ${exportValidation.restrictions.join(', ')}`);
            }
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Create the crypto analysis
                const analysisQuery = `
          INSERT INTO crypto_analyses (
            name, type, status, progress, priority, input_hash, input_size,
            algorithm_detected, confidence_score, reason, classification,
            tenant_id, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `;
                const analysisValues = [
                    input.name,
                    input.type,
                    'queued',
                    0,
                    input.priority || 'medium',
                    input.input_hash,
                    input.input_size,
                    null, // Will be detected during analysis
                    null, // Will be calculated during analysis
                    input.reason,
                    input.classification,
                    tenantId,
                    context.user?.id
                ];
                const analysisResult = await client.query(analysisQuery, analysisValues);
                const newAnalysis = analysisResult.rows[0];
                // Create approval request if required
                if (validation.approvalRequired) {
                    const approvalQuery = `
            INSERT INTO crypto_approvals (
              analysis_id, request_type, status, requested_by, reason,
              dual_control_required, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;
                    const approvalValues = [
                        newAnalysis.id,
                        input.type,
                        'pending',
                        context.user?.id,
                        input.reason,
                        validation.riskLevel === CryptoRiskLevel.CRITICAL,
                        new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
                    ];
                    const approvalResult = await client.query(approvalQuery, approvalValues);
                    const approval = approvalResult.rows[0];
                    // Publish approval request event
                    pubsub.publish(CRYPTO_EVENTS.CRYPTO_APPROVAL_REQUESTED, {
                        cryptoApprovalRequested: approval,
                        tenantId
                    });
                    logger.info(`Approval required for crypto analysis: ${newAnalysis.name}`, {
                        analysisId: newAnalysis.id,
                        riskLevel: validation.riskLevel,
                        dualControlRequired: validation.riskLevel === CryptoRiskLevel.CRITICAL
                    });
                }
                await client.query('COMMIT');
                // Publish analysis creation event
                pubsub.publish(CRYPTO_EVENTS.CRYPTO_ANALYSIS_CREATED, {
                    cryptoAnalysisCreated: newAnalysis,
                    tenantId
                });
                // Start analysis if no approval required
                if (!validation.approvalRequired) {
                    setImmediate(async () => {
                        await executeCryptoAnalysis(newAnalysis, context);
                    });
                }
                // Audit log the operation
                await SecurityAuditLogger.logCryptoOperation(input, context.user, tenantId, newAnalysis, validation.riskLevel, context.db);
                logger.info(`Created crypto analysis: ${newAnalysis.name}`, {
                    analysisId: newAnalysis.id,
                    type: input.type,
                    riskLevel: validation.riskLevel,
                    approvalRequired: validation.approvalRequired,
                    exportControlled: exportValidation.license_required
                });
                return {
                    analysis: newAnalysis,
                    approvalRequired: validation.approvalRequired,
                    riskLevel: validation.riskLevel,
                    restrictions: validation.restrictions,
                    exportLicenseRequired: exportValidation.license_required
                };
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger.error('Failed to create crypto analysis', error);
                throw error;
            }
            finally {
                client.release();
            }
        },
        // Request Crypto Approval
        async requestCryptoApproval(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:analyze');
            const { input } = args;
            const tenantId = context.user?.tenantId;
            // Validate analysis access
            const analysisValid = await TenantIsolationValidator.validateDataAccess('crypto_analysis', input.analysis_id, tenantId, context.db);
            if (!analysisValid) {
                throw new ForbiddenError('Analysis access denied');
            }
            const query = `
        INSERT INTO crypto_approvals (
          analysis_id, request_type, status, requested_by, reason,
          conditions, dual_control_required
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
            const values = [
                input.analysis_id,
                input.request_type,
                'pending',
                context.user?.id,
                input.reason,
                input.conditions || [],
                input.dual_control_required || false
            ];
            const result = await context.db.query(query, values);
            const approval = result.rows[0];
            // Publish approval request event
            pubsub.publish(CRYPTO_EVENTS.CRYPTO_APPROVAL_REQUESTED, {
                cryptoApprovalRequested: approval,
                tenantId
            });
            logger.info(`Crypto approval requested`, {
                approvalId: approval.id,
                analysisId: input.analysis_id,
                requestType: input.request_type,
                dualControlRequired: input.dual_control_required
            });
            return approval;
        },
        // Approve Crypto Request
        async approveCryptoRequest(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:approve');
            const { id, approved, reason } = args;
            const tenantId = context.user?.tenantId;
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Get approval record
                const approvalQuery = `
          SELECT cap.*, ca.tenant_id
          FROM crypto_approvals cap
          JOIN crypto_analyses ca ON ca.id = cap.analysis_id
          WHERE cap.id = $1 AND ca.tenant_id = $2
        `;
                const approvalResult = await client.query(approvalQuery, [id, tenantId]);
                if (approvalResult.rows.length === 0) {
                    throw new UserInputError('Approval request not found');
                }
                const approval = approvalResult.rows[0];
                // Check if dual control is required and this is the first approval
                let updateQuery = `
          UPDATE crypto_approvals 
          SET status = $1, approved_by = $2, responded_at = NOW()
          WHERE id = $3
          RETURNING *
        `;
                if (approval.dual_control_required && approved) {
                    if (!approval.approved_by) {
                        // First approval
                        updateQuery = `
              UPDATE crypto_approvals 
              SET approved_by = $2, status = 'pending_second_approval'
              WHERE id = $3
              RETURNING *
            `;
                    }
                    else if (approval.approved_by !== context.user?.id) {
                        // Second approval
                        updateQuery = `
              UPDATE crypto_approvals 
              SET second_approver = $2, status = $1, responded_at = NOW()
              WHERE id = $3
              RETURNING *
            `;
                    }
                    else {
                        throw new ForbiddenError('Cannot provide both approvals for dual control');
                    }
                }
                const updateValues = [
                    approved ? (approval.dual_control_required && !approval.approved_by ? 'pending_second_approval' : 'approved') : 'rejected',
                    context.user?.id,
                    id
                ];
                const updateResult = await client.query(updateQuery, updateValues);
                const updatedApproval = updateResult.rows[0];
                // If fully approved, start the analysis
                if (approved && updatedApproval.status === 'approved') {
                    const analysisQuery = `SELECT * FROM crypto_analyses WHERE id = $1`;
                    const analysisResult = await client.query(analysisQuery, [approval.analysis_id]);
                    const analysis = analysisResult.rows[0];
                    if (analysis && analysis.status === 'queued') {
                        await client.query('UPDATE crypto_analyses SET status = $1 WHERE id = $2', ['running', analysis.id]);
                        // Start analysis execution
                        setImmediate(async () => {
                            await executeCryptoAnalysis(analysis, context);
                        });
                    }
                }
                await client.query('COMMIT');
                // Publish approval granted event
                if (approved) {
                    pubsub.publish(CRYPTO_EVENTS.CRYPTO_APPROVAL_GRANTED, {
                        cryptoApprovalGranted: updatedApproval,
                        tenantId
                    });
                }
                logger.info(`Crypto approval ${approved ? 'granted' : 'denied'}`, {
                    approvalId: id,
                    analysisId: approval.analysis_id,
                    approvedBy: context.user?.id,
                    dualControl: approval.dual_control_required,
                    status: updatedApproval.status
                });
                return updatedApproval;
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger.error('Failed to process crypto approval', error);
                throw error;
            }
            finally {
                client.release();
            }
        },
        // Access Crypto Results (requires approval)
        async accessCryptoResults(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:plaintext_access');
            const { analysis_id, approval_id } = args;
            const tenantId = context.user?.tenantId;
            // Validate approval
            const approvalQuery = `
        SELECT cap.*, ca.tenant_id, ca.classification
        FROM crypto_approvals cap
        JOIN crypto_analyses ca ON ca.id = cap.analysis_id
        WHERE cap.id = $1 AND cap.analysis_id = $2 AND ca.tenant_id = $3
        AND cap.status = 'approved'
      `;
            const approvalResult = await context.db.query(approvalQuery, [approval_id, analysis_id, tenantId]);
            if (approvalResult.rows.length === 0) {
                throw new ForbiddenError('Valid approval required to access results');
            }
            const approval = approvalResult.rows[0];
            // Get results based on analysis type
            let resultsQuery = '';
            let resultsTable = '';
            switch (approval.request_type) {
                case 'key_recovery':
                    resultsQuery = `SELECT * FROM crypto_key_recovery_results WHERE analysis_id = $1`;
                    resultsTable = 'crypto_key_recovery_results';
                    break;
                case 'plaintext_access':
                    resultsQuery = `SELECT * FROM crypto_hash_results WHERE analysis_id = $1`;
                    resultsTable = 'crypto_hash_results';
                    break;
                default:
                    resultsQuery = `SELECT * FROM crypto_analyses WHERE id = $1`;
                    resultsTable = 'crypto_analyses';
            }
            const resultsResult = await context.db.query(resultsQuery, [analysis_id]);
            if (resultsResult.rows.length === 0) {
                throw new UserInputError('Results not found or not available');
            }
            const results = resultsResult.rows[0];
            // Apply data classification filtering
            const userClearance = context.user?.security_clearance || 1;
            const filteredResults = await DataClassificationHandler.enforceDataHandling(results, approval.classification, userClearance, context.db);
            // Audit log the access
            await context.db.query(`
        INSERT INTO crypto_audit_entries (
          analysis_id, user_id, timestamp, action, details,
          classification, data_accessed, approval_id
        )
        VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7)
      `, [
                analysis_id,
                context.user?.id,
                'accessed_results',
                `Accessed ${approval.request_type} results`,
                approval.classification,
                true,
                approval_id
            ]);
            // Publish key material access event
            pubsub.publish(CRYPTO_EVENTS.KEY_MATERIAL_ACCESSED, {
                keyMaterialAccessed: {
                    analysisId: analysis_id,
                    userId: context.user?.id,
                    approvalId: approval_id,
                    accessType: approval.request_type,
                    timestamp: new Date().toISOString()
                },
                tenantId
            });
            logger.warn(`Sensitive crypto results accessed`, {
                analysisId: analysis_id,
                userId: context.user?.id,
                approvalId: approval_id,
                accessType: approval.request_type,
                classification: approval.classification
            });
            return filteredResults;
        },
        // HSM Operations
        async generateHSMKey(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:hsm');
            const { algorithm, key_size, purpose } = args;
            const tenantId = context.user?.tenantId;
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Create HSM operation record
                const operationQuery = `
          INSERT INTO hsm_operations (
            operation, algorithm, key_id, status, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
                const keyId = `hsm_key_${Date.now()}`;
                const operationValues = [
                    'key_generation',
                    algorithm,
                    keyId,
                    'pending',
                    tenantId
                ];
                const operationResult = await client.query(operationQuery, operationValues);
                const operation = operationResult.rows[0];
                // Create audit entry
                await client.query(`
          INSERT INTO hsm_audit_entries (
            operation_id, timestamp, operation, user_id, key_id, success
          )
          VALUES ($1, NOW(), $2, $3, $4, $5)
        `, [
                    operation.id,
                    'key_generation',
                    context.user?.id,
                    keyId,
                    true
                ]);
                // Simulate HSM key generation
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Update operation as completed
                await client.query('UPDATE hsm_operations SET status = $1, completed_at = NOW() WHERE id = $2', ['completed', operation.id]);
                await client.query('COMMIT');
                // Publish HSM operation completion
                pubsub.publish(CRYPTO_EVENTS.HSM_OPERATION_COMPLETED, {
                    hsmOperationCompleted: {
                        ...operation,
                        status: 'completed',
                        keyId
                    },
                    tenantId
                });
                logger.info(`HSM key generated`, {
                    operationId: operation.id,
                    keyId,
                    algorithm,
                    keySize: key_size,
                    purpose
                });
                return keyId;
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger.error('Failed to generate HSM key', error);
                throw error;
            }
            finally {
                client.release();
            }
        },
        // Emergency Stop
        async emergencyStop(parent, args, context) {
            checkCryptoPermissions(context, 'crypto:write');
            const { reason } = args;
            const tenantId = context.user?.tenantId;
            // Stop all running crypto analyses
            const updateResult = await context.db.query(`UPDATE crypto_analyses 
         SET status = 'cancelled', updated_at = NOW() 
         WHERE tenant_id = $1 AND status IN ('running', 'queued')
         RETURNING id, name`, [tenantId]);
            const stoppedAnalyses = updateResult.rows;
            // Audit log the emergency stop
            await context.db.query(`
        INSERT INTO crypto_audit_entries (
          user_id, timestamp, action, details, classification
        )
        VALUES ($1, NOW(), $2, $3, $4)
      `, [
                context.user?.id,
                'emergency_stop',
                `Emergency stop triggered: ${reason}. Stopped ${stoppedAnalyses.length} analyses.`,
                'restricted'
            ]);
            // Publish security alert
            pubsub.publish(CRYPTO_EVENTS.CRYPTO_SECURITY_ALERT, {
                cryptoSecurityAlert: {
                    type: 'emergency_stop',
                    message: `Emergency stop triggered by ${context.user?.id}`,
                    reason,
                    affectedAnalyses: stoppedAnalyses.length,
                    timestamp: new Date().toISOString()
                },
                tenantId
            });
            logger.warn(`Emergency stop triggered`, {
                userId: context.user?.id,
                reason,
                stoppedAnalyses: stoppedAnalyses.length
            });
            return true;
        },
    },
    Subscription: {
        // Crypto analysis updates
        cryptoAnalysisUpdates: {
            subscribe: withFilter(() => pubsub.asyncIterator([
                CRYPTO_EVENTS.CRYPTO_ANALYSIS_CREATED,
                CRYPTO_EVENTS.CRYPTO_ANALYSIS_UPDATED,
                CRYPTO_EVENTS.CRYPTO_ANALYSIS_COMPLETED
            ]), (payload, variables, context) => {
                if (!context.user)
                    return false;
                try {
                    checkCryptoPermissions(context, 'crypto:read');
                    checkTenantAccess(context, payload.tenantId);
                    return true;
                }
                catch (error) {
                    return false;
                }
            }),
        },
        // Crypto approval requests
        cryptoApprovalRequests: {
            subscribe: withFilter(() => pubsub.asyncIterator([
                CRYPTO_EVENTS.CRYPTO_APPROVAL_REQUESTED,
                CRYPTO_EVENTS.CRYPTO_APPROVAL_GRANTED
            ]), (payload, variables, context) => {
                if (!context.user)
                    return false;
                try {
                    checkCryptoPermissions(context, 'crypto:approve');
                    checkTenantAccess(context, payload.tenantId);
                    return true;
                }
                catch (error) {
                    return false;
                }
            }),
        },
        // Crypto security alerts
        cryptoSecurityAlerts: {
            subscribe: withFilter(() => pubsub.asyncIterator([
                CRYPTO_EVENTS.CRYPTO_SECURITY_ALERT,
                CRYPTO_EVENTS.KEY_MATERIAL_ACCESSED
            ]), (payload, variables, context) => {
                if (!context.user)
                    return false;
                try {
                    checkCryptoPermissions(context, 'crypto:read');
                    checkTenantAccess(context, payload.tenantId);
                    return true;
                }
                catch (error) {
                    return false;
                }
            }),
        },
    },
    // Field resolvers
    CryptoAnalysis: {
        async approvals(parent, args, context) {
            const query = `
        SELECT * FROM crypto_approvals 
        WHERE analysis_id = $1 
        ORDER BY requested_at DESC
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
        async auditEntries(parent, args, context) {
            const query = `
        SELECT * FROM crypto_audit_entries 
        WHERE analysis_id = $1 
        ORDER BY timestamp DESC
        LIMIT 50
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
        async results(parent, args, context) {
            // Only return results if user has appropriate clearance and approval
            const userClearance = context.user?.security_clearance || 1;
            if (parent.classification === SecurityClassification.RESTRICTED && userClearance < 4) {
                return null;
            }
            // Check if results access was approved
            const approvalQuery = `
        SELECT * FROM crypto_approvals 
        WHERE analysis_id = $1 AND status = 'approved'
        AND request_type IN ('plaintext_access', 'key_recovery')
      `;
            const approvalResult = await context.db.query(approvalQuery, [parent.id]);
            if (approvalResult.rows.length === 0 &&
                (parent.type === 'key_recovery' || parent.type === 'plaintext_access')) {
                return null; // Sensitive results require approval
            }
            // Return appropriate results based on analysis type
            switch (parent.type) {
                case 'hash_analysis':
                    const hashQuery = `SELECT * FROM crypto_hash_results WHERE analysis_id = $1`;
                    const hashResult = await context.db.query(hashQuery, [parent.id]);
                    return hashResult.rows[0];
                case 'cipher_analysis':
                    const cipherQuery = `SELECT * FROM crypto_cipher_results WHERE analysis_id = $1`;
                    const cipherResult = await context.db.query(cipherQuery, [parent.id]);
                    return cipherResult.rows[0];
                case 'certificate_analysis':
                    const certQuery = `SELECT * FROM crypto_certificate_results WHERE analysis_id = $1`;
                    const certResult = await context.db.query(certQuery, [parent.id]);
                    return certResult.rows[0];
                default:
                    return null;
            }
        },
    },
    CryptoApproval: {
        async analysis(parent, args, context) {
            const query = `SELECT * FROM crypto_analyses WHERE id = $1`;
            const result = await context.db.query(query, [parent.analysis_id]);
            return result.rows[0];
        },
    },
};
// Crypto analysis execution simulation
async function executeCryptoAnalysis(analysis, context) {
    const logger = Logger.getLogger('crypto-executor');
    try {
        // Update status to running
        await context.db.query('UPDATE crypto_analyses SET status = $1, started_at = NOW() WHERE id = $2', ['running', analysis.id]);
        // Publish analysis update
        pubsub.publish(CRYPTO_EVENTS.CRYPTO_ANALYSIS_UPDATED, {
            cryptoAnalysisUpdated: {
                ...analysis,
                status: 'running',
                started_at: new Date().toISOString()
            },
            tenantId: analysis.tenant_id
        });
        // Simulate analysis duration based on type
        const durations = {
            'hash_analysis': 5000,
            'cipher_analysis': 15000,
            'certificate_analysis': 3000,
            'entropy_analysis': 2000,
            'signature_verification': 1000,
            'key_recovery': 30000 // Longest for most sensitive operation
        };
        const duration = durations[analysis.type] || 5000;
        await new Promise(resolve => setTimeout(resolve, duration));
        // Generate mock results
        const results = await generateAnalysisResults(analysis, context);
        // Update analysis with completion
        await context.db.query(`UPDATE crypto_analyses 
       SET status = $1, completed_at = NOW(), progress = 100, 
           algorithm_detected = $2, confidence_score = $3
       WHERE id = $4`, ['completed', results.algorithm, results.confidence, analysis.id]);
        // Publish completion event
        pubsub.publish(CRYPTO_EVENTS.CRYPTO_ANALYSIS_COMPLETED, {
            cryptoAnalysisCompleted: {
                ...analysis,
                status: 'completed',
                progress: 100,
                algorithm_detected: results.algorithm,
                confidence_score: results.confidence,
                completed_at: new Date().toISOString()
            },
            tenantId: analysis.tenant_id
        });
        logger.info(`Crypto analysis completed: ${analysis.name}`, {
            analysisId: analysis.id,
            type: analysis.type,
            duration: duration / 1000,
            algorithm: results.algorithm,
            confidence: results.confidence
        });
    }
    catch (error) {
        logger.error(`Crypto analysis failed: ${analysis.name}`, error);
        await context.db.query('UPDATE crypto_analyses SET status = $1, completed_at = NOW() WHERE id = $2', ['failed', analysis.id]);
    }
}
async function generateAnalysisResults(analysis, context) {
    // Mock algorithms and confidence based on analysis type
    const algorithms = {
        'hash_analysis': ['MD5', 'SHA1', 'SHA256', 'NTLM', 'bcrypt'],
        'cipher_analysis': ['AES-256-CBC', 'AES-128-CTR', 'DES', '3DES', 'Blowfish'],
        'certificate_analysis': ['RSA-2048', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384'],
        'entropy_analysis': ['Random', 'Pseudo-random', 'Low-entropy', 'Structured'],
        'signature_verification': ['RSA-PKCS1', 'RSA-PSS', 'ECDSA', 'DSA'],
        'key_recovery': ['Brute-force', 'Dictionary', 'Rainbow-table', 'Cryptanalysis']
    };
    const typeAlgorithms = algorithms[analysis.type] || ['Unknown'];
    const algorithm = typeAlgorithms[Math.floor(Math.random() * typeAlgorithms.length)];
    const confidence = Math.random() * 0.4 + 0.6; // 0.6-1.0
    const success = confidence > 0.7;
    // Create type-specific results
    switch (analysis.type) {
        case 'hash_analysis':
            await context.db.query(`
        INSERT INTO crypto_hash_results (
          analysis_id, hash_type, hash_value, crack_difficulty, 
          technique, success, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
                analysis.id, algorithm, analysis.input_hash,
                success ? 'medium' : 'hard', 'dictionary', success
            ]);
            break;
        case 'cipher_analysis':
            await context.db.query(`
        INSERT INTO crypto_cipher_results (
          analysis_id, cipher_type, algorithm_family, 
          encryption_strength, entropy, created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
                analysis.id, algorithm, 'symmetric',
                success ? 'medium' : 'strong', confidence * 8
            ]);
            break;
        case 'certificate_analysis':
            await context.db.query(`
        INSERT INTO crypto_certificate_results (
          analysis_id, certificate_type, format, version,
          key_algorithm, key_size, overall_score, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
                analysis.id, 'x509', 'PEM', 'v3',
                algorithm, 2048, Math.floor(confidence * 100)
            ]);
            break;
    }
    return { algorithm, confidence: Math.round(confidence * 100) / 100, success };
}
//# sourceMappingURL=crypto.js.map