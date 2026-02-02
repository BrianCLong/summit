import { createHash } from 'crypto';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';
import { AdvancedAuditSystem } from '../audit/advanced-audit-system.js';

export interface RemediationAction {
    id: string;
    incidentId: string;
    playbookId: string;
    actionType: string;
    actionPayload: Record<string, any>;
    executedAt: Date;
    executedBy: 'system' | string;
    outcome: 'success' | 'failure' | 'partial';
    errorMessage?: string;
}

export interface SignedRemediationLog {
    action: RemediationAction;
    hash: string;
    signature: string;
    previousHash?: string;
}

export class RemediationExecutionLogger {
    private static instance: RemediationExecutionLogger;
    private auditSystem: AdvancedAuditSystem;
    private signingKey: string;
    private lastHash: string = '';

    private constructor() {
        this.auditSystem = AdvancedAuditSystem.getInstance();
        this.signingKey = process.env.REMEDIATION_SIGNING_KEY || 'dev-remediation-key-insecure';

        if (process.env.NODE_ENV === 'production' && this.signingKey === 'dev-remediation-key-insecure') {
            throw new Error('REMEDIATION_SIGNING_KEY must be set in production for tamper-proof remediation logs');
        }
    }

    public static getInstance(): RemediationExecutionLogger {
        if (!RemediationExecutionLogger.instance) {
            RemediationExecutionLogger.instance = new RemediationExecutionLogger();
        }
        return RemediationExecutionLogger.instance;
    }

    /**
     * Log a remediation action with cryptographic signature
     */
    public async logAction(action: Omit<RemediationAction, 'id' | 'executedAt'>): Promise<SignedRemediationLog> {
        const completeAction: RemediationAction = {
            ...action,
            id: randomUUID(),
            executedAt: new Date()
        };

        // Calculate hash of the action
        const hash = this.calculateHash(completeAction);

        // Sign the action
        const signature = this.signAction(completeAction, hash);

        const signedLog: SignedRemediationLog = {
            action: completeAction,
            hash,
            signature,
            previousHash: this.lastHash || undefined
        };

        // Update chain
        this.lastHash = hash;

        // Record in audit system
        await this.auditSystem.recordEvent({
            eventType: 'task_execute',
            level: action.outcome === 'failure' ? 'error' : 'info',
            action: `remediation:${action.actionType}`,
            outcome: action.outcome,
            message: `Automated remediation executed: ${action.actionType}`,
            details: {
                incidentId: action.incidentId,
                playbookId: action.playbookId,
                actionPayload: action.actionPayload,
                signature: signature,
                hash: hash,
                previousHash: this.lastHash
            },
            complianceRelevant: true,
            complianceFrameworks: ['SOC2', 'ISO27001']
        });

        logger.info({
            actionId: completeAction.id,
            incidentId: action.incidentId,
            playbookId: action.playbookId,
            actionType: action.actionType,
            outcome: action.outcome
        }, 'Remediation action logged and signed');

        return signedLog;
    }

    /**
     * Verify the integrity of a signed remediation log
     */
    public verifyLog(log: SignedRemediationLog): boolean {
        // Verify hash
        const calculatedHash = this.calculateHash(log.action);
        if (calculatedHash !== log.hash) {
            logger.error({ actionId: log.action.id }, 'Hash mismatch - possible tampering detected');
            return false;
        }

        // Verify signature
        const isValid = this.verifySignature(log.action, log.hash, log.signature);
        if (!isValid) {
            logger.error({ actionId: log.action.id }, 'Invalid signature - tampering detected');
            return false;
        }

        return true;
    }

    /**
     * Verify chain integrity across multiple logs
     */
    public verifyChain(logs: SignedRemediationLog[]): { valid: boolean; brokenAt?: number } {
        if (logs.length === 0) return { valid: true };

        for (let i = 1; i < logs.length; i++) {
            const current = logs[i];
            const previous = logs[i - 1];

            if (current.previousHash !== previous.hash) {
                logger.error({
                    currentId: current.action.id,
                    previousId: previous.action.id
                }, 'Chain integrity violation detected');
                return { valid: false, brokenAt: i };
            }

            if (!this.verifyLog(current)) {
                return { valid: false, brokenAt: i };
            }
        }

        return { valid: true };
    }

    private calculateHash(action: RemediationAction): string {
        const data = JSON.stringify({
            id: action.id,
            incidentId: action.incidentId,
            playbookId: action.playbookId,
            actionType: action.actionType,
            actionPayload: action.actionPayload,
            executedAt: action.executedAt.toISOString(),
            executedBy: action.executedBy,
            outcome: action.outcome
        });
        return createHash('sha256').update(data).digest('hex');
    }

    private signAction(action: RemediationAction, hash: string): string {
        // Use HMAC for symmetric key signing
        const hmac = createHash('sha256');
        hmac.update(hash + this.signingKey);
        return hmac.digest('hex');
    }

    private verifySignature(action: RemediationAction, hash: string, signature: string): boolean {
        try {
            // Verify HMAC signature
            const expectedSignature = this.signAction(action, hash);
            return expectedSignature === signature;
        } catch (error) {
            logger.error({ error }, 'Signature verification failed');
            return false;
        }
    }
}

export const remediationLogger = RemediationExecutionLogger.getInstance();
