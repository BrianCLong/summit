import { DataResidencyService } from './residency-service.js';
import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';

export interface ResidencyContext {
    operation: 'storage' | 'compute' | 'logs' | 'backup';
    targetRegion: string;
    dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted' | 'top-secret';
}

export class ResidencyViolationError extends Error {
    constructor(message: string, public tenantId: string, public context: ResidencyContext) {
        super(message);
        this.name = 'ResidencyViolationError';
    }
}

export class ResidencyGuard {
    private static instance: ResidencyGuard;
    private residencyService: DataResidencyService;
    private currentRegion: string;

    private constructor() {
        this.residencyService = new DataResidencyService();
        this.currentRegion = process.env.SUMMIT_REGION || process.env.REGION || 'us-east-1';
    }

    public static getInstance(): ResidencyGuard {
        if (!ResidencyGuard.instance) {
            ResidencyGuard.instance = new ResidencyGuard();
        }
        return ResidencyGuard.instance;
    }

    /**
     * Enforces residency rules for a given operation.
     * Throws ResidencyViolationError if the operation violates the policy.
     */
    async enforce(tenantId: string, context: ResidencyContext): Promise<void> {
        const span = otelService.createSpan('residency.enforce');
        try {
            // Self-check: Is the current region allowed for this tenant?
            // If targetRegion is different from currentRegion, we need to check transfer rules.

            const config = await this.getResidencyConfig(tenantId);
            if (!config) {
                 // Default to strict if no config? Or allow?
                 // Prompt says "No undocumented exceptions", "Only enforced boundaries with evidence".
                 // Safest is to fail if no policy exists, or assume default region is the ONLY allowed region if inferred.
                 // For now, if no config, we assume the tenant is native to the current region and block cross-region.
                 if (context.targetRegion !== this.currentRegion) {
                     throw new ResidencyViolationError(
                         `No residency policy found. strictly blocking cross-region access to ${context.targetRegion}.`,
                         tenantId,
                         context
                     );
                 }
                 return;
            }

            // 1. Check if target region is allowed globally for the tenant
            if (!config.allowedRegions.includes(context.targetRegion) && config.primaryRegion !== context.targetRegion) {
                // Check exceptions
                const activeException = await this.checkExceptions(tenantId, context.targetRegion, context.operation);
                if (!activeException) {
                    throw new ResidencyViolationError(
                        `Region ${context.targetRegion} is not allowed for tenant ${tenantId}.`,
                        tenantId,
                        context
                    );
                }
            }

            // 2. Check Data Classification constraints
            if (context.dataClassification) {
                const classificationRules = config.dataClassifications?.[context.dataClassification];
                if (classificationRules) {
                    const allowedForScope = classificationRules[context.operation]; // e.g. storage: ['us-east-1']
                    if (allowedForScope && !allowedForScope.includes(context.targetRegion)) {
                         // Check exceptions again specific to classification?
                         // For now, classification rules are strict.
                         throw new ResidencyViolationError(
                            `Data classification ${context.dataClassification} prohibits ${context.operation} in ${context.targetRegion}.`,
                            tenantId,
                            context
                        );
                    }
                }
            }

            // 3. Log success (audit handled by caller or generic audit middleware usually, but generic enforcement log is good)
            // We don't want to spam logs for every read, relying on metrics/spans.
            otelService.addSpanAttributes({
                'residency.status': 'allowed',
                'residency.tenant': tenantId,
                'residency.target_region': context.targetRegion
            });

        } catch (error) {
             otelService.addSpanAttributes({
                'residency.status': 'violated',
                'residency.error': error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        } finally {
            span?.end();
        }
    }

    /**
     * Checks if an agent is allowed to execute in the current region/target region.
     */
    async validateAgentExecution(tenantId: string): Promise<void> {
        return this.enforce(tenantId, {
            operation: 'compute',
            targetRegion: this.currentRegion,
            dataClassification: 'internal' // Default for agent execution unless specified
        });
    }

    private async getResidencyConfig(tenantId: string): Promise<any> {
        const pool = getPostgresPool();
        // We reuse the existing table but might need to expand the schema or map it.
        // The existing service uses `data_residency_configs`.
        // row.region is likely the "primaryRegion".
        // row.allowed_transfers might map to "allowedRegions".

        const result = await pool.query(
            'SELECT * FROM data_residency_configs WHERE tenant_id = $1',
            [tenantId]
        );

        if (result.rows.length === 0) return null;
        const row = result.rows[0];

        const allowedTransfers = JSON.parse(row.allowed_transfers || '[]');
        const allowedRegions = [row.region, ...allowedTransfers]; // Primary + Transfers

        // Mocking the full policy structure from the simpler existing DB schema for now
        // In a real migration we'd migrate the DB.
        return {
            primaryRegion: row.region,
            allowedRegions: allowedRegions,
            dataClassifications: {
                'confidential': {
                    'storage': [row.region], // Strict default
                    'compute': [row.region],
                    'logs': [row.region],
                    'backups': [row.region]
                }
            }
        };
    }

    private async checkExceptions(tenantId: string, region: string, operation: string): Promise<boolean> {
        const pool = getPostgresPool();
        try {
            const result = await pool.query(
                `SELECT * FROM residency_exceptions
                 WHERE tenant_id = $1
                 AND target_region = $2
                 AND scope = $3
                 AND expires_at > NOW()`,
                [tenantId, region, operation]
            );
            return result.rows.length > 0;
        } catch (e) {
            // Log real error unless it's just "table doesn't exist" during bootstrap
            const msg = e instanceof Error ? e.message : String(e);
            if (!msg.includes('relation "residency_exceptions" does not exist')) {
                 console.error('Residency Exception Check Failed:', e);
            }
            return false;
        }
    }
}
