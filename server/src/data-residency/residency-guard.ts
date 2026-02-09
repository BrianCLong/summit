import { DataResidencyService } from './residency-service.js';
import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';

export interface ResidencyContext {
    operation: 'storage' | 'compute' | 'logs' | 'backup' | 'export';
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
                        `No residency policy found. Strictly blocking cross-region access to ${context.targetRegion}.`,
                        tenantId,
                        context
                    );
                }
                return;
            }

            const isStrict = config.residencyMode === 'strict';

            // 1. Check if target region is allowed globally for the tenant
            const isPrimary = config.primaryRegion === context.targetRegion;
            const isAllowed = config.allowedRegions.includes(context.targetRegion);

            if (!isPrimary && !isAllowed) {
                // Check exceptions
                const activeException = await this.checkExceptions(tenantId, context.targetRegion, context.operation);
                if (!activeException) {
                    const errorMsg = `Region ${context.targetRegion} is not allowed for tenant ${tenantId}.`;

                    if (isStrict) {
                        throw new ResidencyViolationError(errorMsg, tenantId, context);
                    } else {
                        // In preferred mode, we might log a warning but allow if it's a critical operation?
                        console.warn(`[Residency Warning] ${errorMsg} (Mode: Preferred)`);
                        otelService.addSpanAttributes({ 'residency.warning': errorMsg });
                    }
                }
            }

            // 2. Check Data Classification constraints
            if (context.dataClassification) {
                const classificationRules = config.dataClassifications?.[context.dataClassification];
                if (classificationRules) {
                    const allowedForScope = classificationRules[context.operation]; // e.g. storage: ['us-east-1']
                    if (allowedForScope && !allowedForScope.includes(context.targetRegion)) {
                        const errorMsg = `Data classification ${context.dataClassification} prohibits ${context.operation} in ${context.targetRegion}.`;
                        if (isStrict) {
                            throw new ResidencyViolationError(errorMsg, tenantId, context);
                        } else {
                            console.warn(`[Residency Classification Warning] ${errorMsg}`);
                        }
                    }
                }
            }

            // 3. Log success
            otelService.addSpanAttributes({
                'residency.status': 'allowed',
                'residency.tenant': tenantId,
                'residency.target_region': context.targetRegion,
                'residency.mode': config.residencyMode
            });

        } catch (error: any) {
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

    /**
     * Checks if export to a target region is allowed.
     */
    async checkExportCompliance(tenantId: string, targetRegion: string, classification?: string): Promise<void> {
        return this.enforce(tenantId, {
            operation: 'export',
            targetRegion: targetRegion,
            dataClassification: classification as any
        });
    }

    public async getResidencyConfig(tenantId: string): Promise<any> {
        const pool = getPostgresPool();

        const result = await pool.query(
            'SELECT * FROM data_residency_configs WHERE tenant_id = $1',
            [tenantId]
        );

        if (result.rows.length === 0) return null;
        const row = result.rows[0];

        const allowedRegions = row.allowed_regions ? JSON.parse(row.allowed_regions) : (row.allowed_transfers ? JSON.parse(row.allowed_transfers) : []);
        // Ensure primary region is in allowed list if not explicitly there
        if (!allowedRegions.includes(row.region)) {
            allowedRegions.push(row.region);
        }

        return {
            primaryRegion: row.region,
            allowedRegions: allowedRegions,
            residencyMode: row.residency_mode || 'strict',
            dataClassifications: {
                'confidential': {
                    'storage': [row.region], // Strict default
                    'compute': [row.region],
                    'logs': [row.region],
                    'backups': [row.region],
                    'export': [row.region]
                },
                'restricted': {
                    'storage': [row.region],
                    'export': [row.region]
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
                 AND (scope = $3 OR scope = '*')
                 AND (expires_at IS NULL OR expires_at > NOW())`,
                [tenantId, region, operation]
            );
            return result.rows.length > 0;
        } catch (e: any) {
            // Log real error unless it's just "table doesn't exist" during bootstrap
            const msg = e instanceof Error ? e.message : String(e);
            if (!msg.includes('relation "residency_exceptions" does not exist')) {
                console.error('Residency Exception Check Failed:', e);
            }
            return false;
        }
    }
}
