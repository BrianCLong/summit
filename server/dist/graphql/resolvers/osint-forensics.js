import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';
import { pubsub } from '../pubsub';
import { Logger } from '../../config/logger';
import { LegalComplianceValidator, SecurityAuditLogger, TenantIsolationValidator, DataClassificationHandler, OSINTLegalBasis, SecurityClassification } from '../middleware/security-guardrails';
import { ConnectorComplianceService } from '../../services/ConnectorComplianceService.js';
const logger = Logger.getLogger('osint-forensics-resolvers');
// Event types for OSINT/Forensics subscriptions
const OSINT_FORENSICS_EVENTS = {
    OSINT_TASK_CREATED: 'OSINT_TASK_CREATED',
    OSINT_TASK_UPDATED: 'OSINT_TASK_UPDATED',
    OSINT_DATA_COLLECTED: 'OSINT_DATA_COLLECTED',
    FORENSIC_CASE_CREATED: 'FORENSIC_CASE_CREATED',
    FORENSIC_CASE_UPDATED: 'FORENSIC_CASE_UPDATED',
    EVIDENCE_ACQUIRED: 'EVIDENCE_ACQUIRED',
    CHAIN_OF_CUSTODY_UPDATED: 'CHAIN_OF_CUSTODY_UPDATED',
    LEGAL_HOLD_TRIGGERED: 'LEGAL_HOLD_TRIGGERED',
};
// RBAC permission checks
const checkOSINTPermissions = (context, action, resource) => {
    if (!context.user) {
        throw new AuthenticationError('Authentication required');
    }
    const requiredPermissions = {
        'osint:read': ['analyst', 'investigator', 'admin'],
        'osint:write': ['investigator', 'admin'],
        'osint:collect': ['analyst', 'investigator', 'admin'],
        'osint:export': ['investigator', 'admin'],
        'forensics:read': ['forensic_analyst', 'investigator', 'admin'],
        'forensics:write': ['forensic_analyst', 'admin'],
        'forensics:evidence': ['forensic_analyst', 'admin'],
        'forensics:custody': ['forensic_analyst', 'legal_counsel', 'admin'],
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
export const osintForensicsResolvers = {
    Query: {
        // OSINT Sources
        async osintSources(parent, args, context) {
            checkOSINTPermissions(context, 'osint:read');
            const { source_type, category, status, tenant_id, limit = 50, offset = 0 } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT os.*, 
               COUNT(ot.id) as active_tasks,
               AVG(os.reliability_score) as avg_reliability
        FROM osint_sources os
        LEFT JOIN osint_tasks ot ON ot.source_id = os.id AND ot.status IN ('running', 'scheduled')
        WHERE os.tenant_id = $1
        ${source_type ? 'AND os.source_type = $2' : ''}
        ${category ? 'AND os.category = $3' : ''}
        ${status ? 'AND os.status = $4' : ''}
        GROUP BY os.id
        ORDER BY os.created_at DESC
        LIMIT $5 OFFSET $6
      `;
            const params = [userTenantId];
            let paramIndex = 2;
            if (source_type)
                params.push(source_type);
            if (category)
                params.push(category);
            if (status)
                params.push(status);
            params.push(limit, offset);
            const result = await context.db.query(query, params);
            logger.info(`Retrieved ${result.rows.length} OSINT sources`, {
                userId: context.user.id,
                tenantId: userTenantId,
                filters: { source_type, category, status }
            });
            return result.rows;
        },
        // OSINT Tasks
        async osintTasks(parent, args, context) {
            checkOSINTPermissions(context, 'osint:read');
            const { source_id, task_type, status, priority, tenant_id, limit = 50, offset = 0 } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT ot.*, 
               os.name as source_name,
               os.source_type,
               COUNT(odp.id) as data_points_collected
        FROM osint_tasks ot
        JOIN osint_sources os ON os.id = ot.source_id
        LEFT JOIN osint_data_points odp ON odp.task_id = ot.id
        WHERE ot.tenant_id = $1
        ${source_id ? 'AND ot.source_id = $2' : ''}
        ${task_type ? 'AND ot.task_type = $3' : ''}
        ${status ? 'AND ot.status = $4' : ''}
        ${priority ? 'AND ot.priority = $5' : ''}
        GROUP BY ot.id, os.name, os.source_type
        ORDER BY ot.created_at DESC
        LIMIT $6 OFFSET $7
      `;
            const params = [userTenantId];
            let paramIndex = 2;
            if (source_id)
                params.push(source_id);
            if (task_type)
                params.push(task_type);
            if (status)
                params.push(status);
            if (priority)
                params.push(priority);
            params.push(limit, offset);
            const result = await context.db.query(query, params);
            return result.rows;
        },
        // Forensic Cases
        async forensicCases(parent, args, context) {
            checkOSINTPermissions(context, 'forensics:read');
            const { status, case_type, priority, assigned_to, tenant_id, limit = 50, offset = 0 } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT fc.*, 
               COUNT(fe.id) as evidence_count,
               COUNT(fa.id) as artifact_count,
               SUM(CASE WHEN fe.admissible = true THEN 1 ELSE 0 END) as admissible_evidence_count
        FROM forensic_cases fc
        LEFT JOIN forensic_evidence fe ON fe.case_id = fc.id
        LEFT JOIN forensic_artifacts fa ON fa.evidence_id = fe.id
        WHERE fc.tenant_id = $1
        ${status ? 'AND fc.status = $2' : ''}
        ${case_type ? 'AND fc.case_type = $3' : ''}
        ${priority ? 'AND fc.priority = $4' : ''}
        ${assigned_to ? 'AND fc.assigned_to = $5' : ''}
        GROUP BY fc.id
        ORDER BY fc.created_at DESC
        LIMIT $6 OFFSET $7
      `;
            const params = [userTenantId];
            let paramIndex = 2;
            if (status)
                params.push(status);
            if (case_type)
                params.push(case_type);
            if (priority)
                params.push(priority);
            if (assigned_to)
                params.push(assigned_to);
            params.push(limit, offset);
            const result = await context.db.query(query, params);
            return result.rows;
        },
        // Forensic Evidence
        async forensicEvidence(parent, args, context) {
            checkOSINTPermissions(context, 'forensics:read');
            const { case_id, evidence_type, status, tenant_id } = args;
            const userTenantId = tenant_id || context.user?.tenantId;
            checkTenantAccess(context, userTenantId);
            const query = `
        SELECT fe.*, 
               fc.case_number,
               fc.case_name,
               COUNT(fa.id) as artifact_count,
               COUNT(coc.id) as custody_events
        FROM forensic_evidence fe
        JOIN forensic_cases fc ON fc.id = fe.case_id
        LEFT JOIN forensic_artifacts fa ON fa.evidence_id = fe.id
        LEFT JOIN chain_of_custody coc ON coc.evidence_id = fe.id
        WHERE fe.tenant_id = $1
        ${case_id ? 'AND fe.case_id = $2' : ''}
        ${evidence_type ? 'AND fe.evidence_type = $3' : ''}
        ${status ? 'AND fe.status = $4' : ''}
        GROUP BY fe.id, fc.case_number, fc.case_name
        ORDER BY fe.acquired_at DESC
      `;
            const params = [userTenantId];
            if (case_id)
                params.push(case_id);
            if (evidence_type)
                params.push(evidence_type);
            if (status)
                params.push(status);
            const result = await context.db.query(query, params);
            return result.rows;
        },
    },
    Mutation: {
        // Create OSINT Task (with legal compliance)
        async createOSINTTask(parent, args, context) {
            checkOSINTPermissions(context, 'osint:collect');
            const { input } = args;
            const tenantId = input.tenant_id || context.user?.tenantId;
            checkTenantAccess(context, tenantId);
            // Validate legal compliance
            const validation = await LegalComplianceValidator.validateOSINTCollection(input, context.user, tenantId, context.db);
            // Enforce legal basis + export controls gate
            ConnectorComplianceService.enforceLegalBasis({
                sourceId: String(input.source_id),
                legalBasis: input.legal_basis,
            });
            ConnectorComplianceService.enforceExportControls({
                sourceId: String(input.source_id),
                targetCountries: input.target_countries || [],
            });
            if (!validation.allowed) {
                logger.warn('OSINT task creation blocked by legal compliance', {
                    userId: context.user.id,
                    reasons: validation.reasons
                });
                throw new ForbiddenError(`OSINT task denied: ${validation.reasons.join(', ')}`);
            }
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Create the OSINT task
                const taskQuery = `
          INSERT INTO osint_tasks (
            name, description, task_type, status, priority, source_id,
            query_terms, collection_frequency, max_results, data_retention_days,
            legal_basis, data_types, target_countries, target_regions,
            compliance_flags, tenant_id, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *
        `;
                const taskValues = [
                    input.name,
                    input.description,
                    input.task_type,
                    'scheduled',
                    input.priority || 'medium',
                    input.source_id,
                    input.query_terms || [],
                    input.collection_frequency,
                    input.max_results || 100,
                    input.data_retention_days || 90,
                    input.legal_basis,
                    input.data_types || [],
                    input.target_countries || [],
                    input.target_regions || [],
                    validation.restrictions,
                    tenantId,
                    context.user?.id
                ];
                const taskResult = await client.query(taskQuery, taskValues);
                const newTask = taskResult.rows[0];
                // Create legal compliance record
                if (input.legal_basis) {
                    await client.query(`
            INSERT INTO legal_compliance_records (
              resource_type, resource_id, legal_basis, data_types,
              compliance_framework, retention_period, consent_obtained,
              tenant_id, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
                        'osint_task',
                        newTask.id,
                        input.legal_basis,
                        input.data_types,
                        'gdpr', // Default framework
                        input.data_retention_days,
                        input.legal_basis === OSINTLegalBasis.CONSENT,
                        tenantId,
                        context.user?.id
                    ]);
                }
                await client.query('COMMIT');
                // Publish task creation event
                pubsub.publish(OSINT_FORENSICS_EVENTS.OSINT_TASK_CREATED, {
                    osintTaskCreated: newTask,
                    tenantId
                });
                // Start task execution
                setImmediate(async () => {
                    await executeOSINTTask(newTask, context);
                });
                logger.info(`Created OSINT task: ${newTask.name}`, {
                    taskId: newTask.id,
                    sourceId: input.source_id,
                    legalBasis: input.legal_basis,
                    restrictions: validation.restrictions
                });
                return {
                    task: newTask,
                    complianceWarnings: validation.restrictions,
                    legalBasisValid: !!input.legal_basis
                };
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger.error('Failed to create OSINT task', error);
                throw error;
            }
            finally {
                client.release();
            }
        },
        // Create Forensic Case
        async createForensicCase(parent, args, context) {
            checkOSINTPermissions(context, 'forensics:write');
            const { input } = args;
            const tenantId = input.tenant_id || context.user?.tenantId;
            checkTenantAccess(context, tenantId);
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Generate case number
                const caseNumberQuery = `
          SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_number
          FROM forensic_cases 
          WHERE tenant_id = $1 AND case_number LIKE 'CASE-' || EXTRACT(YEAR FROM NOW()) || '-%'
        `;
                const caseNumberResult = await client.query(caseNumberQuery, [tenantId]);
                const nextNumber = caseNumberResult.rows[0].next_number;
                const caseNumber = `CASE-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;
                // Create the forensic case
                const caseQuery = `
          INSERT INTO forensic_cases (
            case_number, case_name, description, case_type, status, priority,
            jurisdiction, legal_hold_status, chain_of_custody_initiated,
            evidence_integrity_verified, admissible_evidence_required,
            lead_investigator, legal_counsel, court_order_number,
            tenant_id, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *
        `;
                const caseValues = [
                    caseNumber,
                    input.case_name,
                    input.description,
                    input.case_type,
                    'active',
                    input.priority || 'medium',
                    input.jurisdiction,
                    'active',
                    true,
                    true,
                    input.admissible_evidence_required || false,
                    input.lead_investigator || context.user?.id,
                    input.legal_counsel,
                    input.court_order_number,
                    tenantId,
                    context.user?.id
                ];
                const caseResult = await client.query(caseQuery, caseValues);
                const newCase = caseResult.rows[0];
                // Create initial chain of custody record
                await client.query(`
          INSERT INTO case_custody_log (
            case_id, action, performed_by, details, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5)
        `, [
                    newCase.id,
                    'case_created',
                    context.user?.id,
                    `Case ${caseNumber} created`,
                    tenantId
                ]);
                await client.query('COMMIT');
                // Publish case creation event
                pubsub.publish(OSINT_FORENSICS_EVENTS.FORENSIC_CASE_CREATED, {
                    forensicCaseCreated: newCase,
                    tenantId
                });
                logger.info(`Created forensic case: ${caseNumber}`, {
                    caseId: newCase.id,
                    caseType: input.case_type,
                    priority: input.priority
                });
                return newCase;
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger.error('Failed to create forensic case', error);
                throw error;
            }
            finally {
                client.release();
            }
        },
        // Acquire Forensic Evidence
        async acquireForensicEvidence(parent, args, context) {
            checkOSINTPermissions(context, 'forensics:evidence');
            const { input } = args;
            const tenantId = input.tenant_id || context.user?.tenantId;
            checkTenantAccess(context, tenantId);
            // Validate case access
            const caseValid = await TenantIsolationValidator.validateDataAccess('forensic_case', input.case_id, tenantId, context.db);
            if (!caseValid) {
                throw new ForbiddenError('Case access denied');
            }
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Generate evidence number
                const evidenceNumberQuery = `
          SELECT COALESCE(MAX(CAST(SUBSTRING(evidence_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_number
          FROM forensic_evidence 
          WHERE case_id = $1
        `;
                const evidenceNumberResult = await client.query(evidenceNumberQuery, [input.case_id]);
                const nextNumber = evidenceNumberResult.rows[0].next_number;
                const evidenceNumber = `EVID-${nextNumber.toString().padStart(3, '0')}`;
                // Classify the evidence data
                const classification = DataClassificationHandler.classifyData(input);
                // Create the evidence record
                const evidenceQuery = `
          INSERT INTO forensic_evidence (
            case_id, evidence_number, evidence_type, category, description,
            status, source_location, file_hash_sha256, file_size_bytes,
            acquisition_method, chain_of_custody_documented, integrity_verified,
            admissible, classification, handling_restrictions, retention_period,
            tenant_id, acquired_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING *
        `;
                const evidenceValues = [
                    input.case_id,
                    evidenceNumber,
                    input.evidence_type,
                    input.category,
                    input.description,
                    'acquired',
                    input.source_location,
                    input.file_hash_sha256,
                    input.file_size_bytes,
                    input.acquisition_method,
                    true,
                    input.integrity_verified || false,
                    input.admissible || false,
                    classification.classification,
                    classification.handlingRestrictions,
                    classification.retentionPeriod,
                    tenantId,
                    context.user?.id
                ];
                const evidenceResult = await client.query(evidenceQuery, evidenceValues);
                const newEvidence = evidenceResult.rows[0];
                // Create initial chain of custody entry
                await client.query(`
          INSERT INTO chain_of_custody (
            evidence_id, action, performed_by, location, hash_verified,
            details, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
                    newEvidence.id,
                    'acquired',
                    context.user?.id,
                    input.source_location,
                    input.integrity_verified,
                    `Evidence acquired: ${input.description}`,
                    tenantId
                ]);
                await client.query('COMMIT');
                // Publish evidence acquisition event
                pubsub.publish(OSINT_FORENSICS_EVENTS.EVIDENCE_ACQUIRED, {
                    evidenceAcquired: newEvidence,
                    tenantId
                });
                logger.info(`Acquired forensic evidence: ${evidenceNumber}`, {
                    evidenceId: newEvidence.id,
                    caseId: input.case_id,
                    evidenceType: input.evidence_type,
                    classification: classification.classification
                });
                return {
                    evidence: newEvidence,
                    classification: classification.classification,
                    handlingRestrictions: classification.handlingRestrictions,
                    chainOfCustodyInitiated: true
                };
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger.error('Failed to acquire forensic evidence', error);
                throw error;
            }
            finally {
                client.release();
            }
        },
        // Update Chain of Custody
        async updateChainOfCustody(parent, args, context) {
            checkOSINTPermissions(context, 'forensics:custody');
            const { input } = args;
            const tenantId = context.user?.tenantId;
            // Validate evidence access
            const evidenceValid = await TenantIsolationValidator.validateDataAccess('forensic_evidence', input.evidence_id, tenantId, context.db);
            if (!evidenceValid) {
                throw new ForbiddenError('Evidence access denied');
            }
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Verify evidence hash if provided
                let hashVerified = false;
                if (input.current_hash) {
                    const evidenceQuery = `SELECT file_hash_sha256 FROM forensic_evidence WHERE id = $1`;
                    const evidenceResult = await client.query(evidenceQuery, [input.evidence_id]);
                    const originalHash = evidenceResult.rows[0]?.file_hash_sha256;
                    hashVerified = originalHash === input.current_hash;
                }
                // Create chain of custody entry
                const custodyQuery = `
          INSERT INTO chain_of_custody (
            evidence_id, action, performed_by, location, hash_verified,
            details, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
                const custodyValues = [
                    input.evidence_id,
                    input.action,
                    context.user?.id,
                    input.location,
                    hashVerified,
                    input.details,
                    tenantId
                ];
                const custodyResult = await client.query(custodyQuery, custodyValues);
                const custodyEntry = custodyResult.rows[0];
                // Update evidence status if transferred
                if (input.action === 'transferred') {
                    await client.query('UPDATE forensic_evidence SET current_location = $1, updated_at = NOW() WHERE id = $2', [input.location, input.evidence_id]);
                }
                await client.query('COMMIT');
                // Publish chain of custody update event
                pubsub.publish(OSINT_FORENSICS_EVENTS.CHAIN_OF_CUSTODY_UPDATED, {
                    chainOfCustodyUpdated: custodyEntry,
                    tenantId
                });
                logger.info(`Chain of custody updated for evidence ${input.evidence_id}`, {
                    action: input.action,
                    performedBy: context.user?.id,
                    hashVerified
                });
                return {
                    custodyEntry,
                    hashVerified,
                    integrityMaintained: hashVerified
                };
            }
            catch (error) {
                await client.query('ROLLBACK');
                logger.error('Failed to update chain of custody', error);
                throw error;
            }
            finally {
                client.release();
            }
        },
    },
    Subscription: {
        // OSINT task updates
        osintTaskUpdates: {
            subscribe: withFilter(() => pubsub.asyncIterator([
                OSINT_FORENSICS_EVENTS.OSINT_TASK_CREATED,
                OSINT_FORENSICS_EVENTS.OSINT_TASK_UPDATED,
                OSINT_FORENSICS_EVENTS.OSINT_DATA_COLLECTED
            ]), (payload, variables, context) => {
                if (!context.user)
                    return false;
                try {
                    checkOSINTPermissions(context, 'osint:read');
                    checkTenantAccess(context, payload.tenantId);
                    return true;
                }
                catch (error) {
                    return false;
                }
            }),
        },
        // Forensic case updates
        forensicCaseUpdates: {
            subscribe: withFilter(() => pubsub.asyncIterator([
                OSINT_FORENSICS_EVENTS.FORENSIC_CASE_CREATED,
                OSINT_FORENSICS_EVENTS.FORENSIC_CASE_UPDATED,
                OSINT_FORENSICS_EVENTS.EVIDENCE_ACQUIRED
            ]), (payload, variables, context) => {
                if (!context.user)
                    return false;
                try {
                    checkOSINTPermissions(context, 'forensics:read');
                    checkTenantAccess(context, payload.tenantId);
                    return true;
                }
                catch (error) {
                    return false;
                }
            }),
        },
        // Chain of custody updates
        chainOfCustodyUpdates: {
            subscribe: withFilter(() => pubsub.asyncIterator([OSINT_FORENSICS_EVENTS.CHAIN_OF_CUSTODY_UPDATED]), (payload, variables, context) => {
                if (!context.user)
                    return false;
                try {
                    checkOSINTPermissions(context, 'forensics:custody');
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
    OSINTTask: {
        async source(parent, args, context) {
            const query = `SELECT * FROM osint_sources WHERE id = $1`;
            const result = await context.db.query(query, [parent.source_id]);
            return result.rows[0];
        },
        async dataPoints(parent, args, context) {
            const query = `
        SELECT * FROM osint_data_points 
        WHERE task_id = $1 
        ORDER BY collected_at DESC
        LIMIT 100
      `;
            const result = await context.db.query(query, [parent.id]);
            // Apply data classification filtering based on user clearance
            const userClearance = context.user?.security_clearance || 1;
            const filteredResults = await Promise.all(result.rows.map(async (dataPoint) => {
                const classification = dataPoint.classification || SecurityClassification.PUBLIC;
                return await DataClassificationHandler.enforceDataHandling(dataPoint, classification, userClearance, context.db);
            }));
            return filteredResults;
        },
    },
    ForensicCase: {
        async evidence(parent, args, context) {
            const query = `
        SELECT * FROM forensic_evidence 
        WHERE case_id = $1 
        ORDER BY acquired_at DESC
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
        async custodyLog(parent, args, context) {
            const query = `
        SELECT * FROM case_custody_log 
        WHERE case_id = $1 
        ORDER BY timestamp DESC
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
    },
    ForensicEvidence: {
        async case(parent, args, context) {
            const query = `SELECT * FROM forensic_cases WHERE id = $1`;
            const result = await context.db.query(query, [parent.case_id]);
            return result.rows[0];
        },
        async chainOfCustody(parent, args, context) {
            const query = `
        SELECT * FROM chain_of_custody 
        WHERE evidence_id = $1 
        ORDER BY timestamp DESC
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
        async artifacts(parent, args, context) {
            const query = `
        SELECT * FROM forensic_artifacts 
        WHERE evidence_id = $1 
        ORDER BY extracted_at DESC
      `;
            const result = await context.db.query(query, [parent.id]);
            return result.rows;
        },
    },
};
// OSINT task execution simulation
async function executeOSINTTask(task, context) {
    const logger = Logger.getLogger('osint-executor');
    try {
        // Update status to running
        await context.db.query('UPDATE osint_tasks SET status = $1, started_at = NOW() WHERE id = $2', ['running', task.id]);
        // Simulate data collection
        const collectionResults = await simulateDataCollection(task, context);
        // Update task with results
        await context.db.query(`UPDATE osint_tasks 
       SET status = $1, completed_at = NOW(), data_points_collected = $2
       WHERE id = $3`, ['completed', collectionResults.length, task.id]);
        // Audit log the operation
        await SecurityAuditLogger.logOSINTOperation(task, { id: task.created_by }, task.tenant_id, { classification: SecurityClassification.INTERNAL }, context.db);
        // Publish task completion
        pubsub.publish(OSINT_FORENSICS_EVENTS.OSINT_TASK_UPDATED, {
            osintTaskUpdated: {
                ...task,
                status: 'completed',
                data_points_collected: collectionResults.length
            },
            tenantId: task.tenant_id
        });
        logger.info(`OSINT task completed: ${task.name}`, {
            taskId: task.id,
            dataPointsCollected: collectionResults.length
        });
        // Update connector freshness metric
        try {
            const latest = collectionResults[collectionResults.length - 1];
            const seconds = latest ? Math.max(0, (Date.now() - new Date(latest.collected_at).getTime()) / 1000) : 0;
            ConnectorComplianceService.recordFreshnessSeconds(String(task.source_id), seconds);
        }
        catch { }
    }
    catch (error) {
        logger.error(`OSINT task failed: ${task.name}`, error);
        await context.db.query('UPDATE osint_tasks SET status = $1, completed_at = NOW() WHERE id = $2', ['failed', task.id]);
    }
}
async function simulateDataCollection(task, context) {
    const results = [];
    const maxResults = task.max_results || 50;
    const numResults = Math.min(Math.floor(Math.random() * maxResults) + 1, maxResults);
    for (let i = 0; i < numResults; i++) {
        const dataPoint = {
            id: `dp_${Date.now()}_${i}`,
            task_id: task.id,
            data_type: task.data_types?.[Math.floor(Math.random() * task.data_types.length)] || 'text',
            content: `Simulated OSINT data point ${i + 1}`,
            source_url: `https://example.com/data/${i + 1}`,
            reliability_score: Math.random() * 0.5 + 0.5, // 0.5-1.0
            confidence_score: Math.random() * 0.5 + 0.5, // 0.5-1.0
            classification: SecurityClassification.INTERNAL,
            tenant_id: task.tenant_id,
            collected_at: new Date().toISOString()
        };
        // Insert data point
        await context.db.query(`
      INSERT INTO osint_data_points (
        task_id, data_type, content, source_url, reliability_score,
        confidence_score, classification, tenant_id, collected_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
            dataPoint.task_id, dataPoint.data_type, dataPoint.content,
            dataPoint.source_url, dataPoint.reliability_score,
            dataPoint.confidence_score, dataPoint.classification,
            dataPoint.tenant_id, dataPoint.collected_at
        ]);
        results.push(dataPoint);
    }
    return results;
}
//# sourceMappingURL=osint-forensics.js.map