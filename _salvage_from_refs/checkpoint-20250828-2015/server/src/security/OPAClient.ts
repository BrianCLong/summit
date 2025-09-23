import axios, { AxiosInstance } from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';

interface OPAInput {
  action: string;
  principal: {
    id: string;
    tenant_id: string;
    roles: string[];
    permissions: string[];
    security_clearance?: string;
    team_id?: string;
  };
  resource: {
    id: string;
    type: string;
    tenant_id: string;
    classification?: string;
    time_restricted?: boolean;
    export_allowed_after?: number;
    export_allowed_before?: number;
    estimated_size?: number;
    retention_policy?: {
      max_age_seconds: number;
    };
    created_at?: number;
    // Resource-specific fields
    assigned_users?: string[];
    collaborators?: string[];
    owner_id?: string;
    visibility?: 'public' | 'restricted' | 'private';
    entity_ids?: string[];
  };
  reason_for_access?: string;
  export_format?: string;
  export_purpose?: string;
  approval_id?: string;
  timestamp: number;
}

interface OPAResult {
  result: {
    allowed: boolean;
    scope_valid: boolean;
    reason_provided: boolean;
    cross_tenant_ok: boolean;
    classification_ok: boolean;
    time_constraints_ok: boolean;
    rate_limit_ok: boolean;
    format_allowed: boolean;
    size_ok: boolean;
    retention_ok: boolean;
    purpose_valid: boolean;
    violations: string[];
  };
}

interface PolicyBundle {
  name: string;
  content: string;
  version: string;
  checksum: string;
}

/**
 * OPA (Open Policy Agent) Client for IntelGraph
 * Enforces export policies, cross-tenant isolation, and access controls
 */
export class OPAClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private policyBundles: Map<string, PolicyBundle> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(opaUrl: string = 'http://localhost:8181') {
    this.baseUrl = opaUrl;
    this.client = axios.create({
      baseURL: opaUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.startHealthCheck();
  }

  /**
   * Initialize OPA with IntelGraph policies
   */
  async initialize(): Promise<void> {
    try {
      // Load and upload export policies
      await this.loadAndUploadPolicy('export', join(__dirname, 'policies/export.rego'));
      
      // Load additional policies if they exist
      try {
        await this.loadAndUploadPolicy('streaming', join(__dirname, 'policies/streaming.rego'));
      } catch (error) {
        console.log('Streaming policies not found, skipping');
      }

      console.log('OPA client initialized with IntelGraph policies');
      
    } catch (error) {
      console.error('Failed to initialize OPA client:', error);
      throw error;
    }
  }

  /**
   * Evaluate export authorization
   */
  async authorizeExport(input: Partial<OPAInput>): Promise<{
    allowed: boolean;
    violations: string[];
    details: OPAResult['result'];
  }> {
    const fullInput: OPAInput = {
      action: 'export',
      timestamp: Date.now(),
      ...input
    };

    try {
      const response = await this.client.post<OPAResult>(
        '/v1/data/intelgraph/export/export_decision',
        { input: fullInput }
      );

      const result = response.data.result;
      
      return {
        allowed: result.allowed,
        violations: result.violations || [],
        details: result
      };

    } catch (error) {
      console.error('OPA export authorization failed:', error);
      
      // Fail-safe: deny access if OPA is unavailable
      return {
        allowed: false,
        violations: ['opa_evaluation_failed'],
        details: {
          allowed: false,
          scope_valid: false,
          reason_provided: false,
          cross_tenant_ok: false,
          classification_ok: false,
          time_constraints_ok: false,
          rate_limit_ok: false,
          format_allowed: false,
          size_ok: false,
          retention_ok: false,
          purpose_valid: false,
          violations: ['opa_evaluation_failed']
        }
      };
    }
  }

  /**
   * Evaluate streaming/messaging authorization
   */
  async authorizeStreaming(input: Partial<OPAInput>): Promise<{
    allowed: boolean;
    violations: string[];
  }> {
    const fullInput: OPAInput = {
      action: 'stream',
      timestamp: Date.now(),
      ...input
    };

    try {
      const response = await this.client.post(
        '/v1/data/intelgraph/streaming/allow',
        { input: fullInput }
      );

      return {
        allowed: response.data.result || false,
        violations: []
      };

    } catch (error) {
      console.error('OPA streaming authorization failed:', error);
      
      // Fail-safe: deny access
      return {
        allowed: false,
        violations: ['opa_evaluation_failed']
      };
    }
  }

  /**
   * Bulk authorization for multiple resources
   */
  async authorizeBulk(inputs: Array<Partial<OPAInput>>): Promise<Array<{
    input: Partial<OPAInput>;
    allowed: boolean;
    violations: string[];
  }>> {
    const results = await Promise.allSettled(
      inputs.map(input => this.authorizeExport(input))
    );

    return results.map((result, index) => ({
      input: inputs[index],
      allowed: result.status === 'fulfilled' ? result.value.allowed : false,
      violations: result.status === 'fulfilled' ? result.value.violations : ['evaluation_failed']
    }));
  }

  /**
   * Update policy data (entities, export history, etc.)
   */
  async updateData(dataPath: string, data: any): Promise<void> {
    try {
      await this.client.put(`/v1/data/${dataPath}`, data);
      console.log(`Updated OPA data at path: ${dataPath}`);
    } catch (error) {
      console.error(`Failed to update OPA data at ${dataPath}:`, error);
      throw error;
    }
  }

  /**
   * Update export history for rate limiting
   */
  async updateExportHistory(userId: string, exportCount: number): Promise<void> {
    await this.updateData(`export_history/${userId}`, {
      recent_count: exportCount,
      last_updated: Math.floor(Date.now() / 1000)
    });
  }

  /**
   * Update entity data for access control
   */
  async updateEntityData(entityId: string, entity: {
    tenant_id: string;
    visibility: 'public' | 'restricted' | 'private';
    owner_id: string;
    classification?: string;
  }): Promise<void> {
    await this.updateData(`entities/${entityId}`, entity);
  }

  /**
   * Create export approval record
   */
  async createExportApproval(approval: {
    id: string;
    principal_id: string;
    resource_id: string;
    status: 'pending' | 'approved' | 'denied';
    approved_by?: string;
    approved_at?: number;
    expires_at?: number;
  }): Promise<void> {
    await this.updateData(`export_approvals/${approval.id}`, approval);
  }

  /**
   * Load and upload policy from file
   */
  private async loadAndUploadPolicy(name: string, filePath: string): Promise<void> {
    try {
      const policyContent = readFileSync(filePath, 'utf8');
      const checksum = require('crypto')
        .createHash('sha256')
        .update(policyContent)
        .digest('hex');

      const bundle: PolicyBundle = {
        name,
        content: policyContent,
        version: '1.0.0',
        checksum
      };

      // Upload policy to OPA
      await this.client.put(`/v1/policies/${name}`, policyContent, {
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      this.policyBundles.set(name, bundle);
      console.log(`Uploaded policy: ${name} (${checksum.substring(0, 8)})`);

    } catch (error) {
      console.error(`Failed to load policy ${name} from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get policy status and health
   */
  async getStatus(): Promise<{
    healthy: boolean;
    policies: Array<{
      name: string;
      version: string;
      checksum: string;
    }>;
    uptime: number;
  }> {
    try {
      const [healthResponse, policiesResponse] = await Promise.all([
        this.client.get('/health'),
        this.client.get('/v1/policies')
      ]);

      return {
        healthy: healthResponse.status === 200,
        policies: Array.from(this.policyBundles.values()).map(bundle => ({
          name: bundle.name,
          version: bundle.version,
          checksum: bundle.checksum
        })),
        uptime: Date.now() // Simplified
      };

    } catch (error) {
      console.error('Failed to get OPA status:', error);
      return {
        healthy: false,
        policies: [],
        uptime: 0
      };
    }
  }

  /**
   * Test policy with sample data
   */
  async testPolicy(policyPath: string, input: any): Promise<any> {
    try {
      const response = await this.client.post(`/v1/data/${policyPath}`, {
        input
      });

      return response.data.result;
    } catch (error) {
      console.error(`Failed to test policy ${policyPath}:`, error);
      throw error;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.client.get('/health', { timeout: 2000 });
      } catch (error) {
        console.warn('OPA health check failed:', error.message);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop health checks and cleanup
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * Express middleware for policy enforcement
   */
  createMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        // Skip for non-sensitive operations
        if (!this.requiresAuthorization(req)) {
          return next();
        }

        // Build OPA input from request
        const input = this.buildInputFromRequest(req);
        
        // Evaluate policy
        const result = await this.authorizeExport(input);
        
        if (!result.allowed) {
          return res.status(403).json({
            error: 'POLICY_VIOLATION',
            message: 'Operation denied by security policy',
            violations: result.violations,
            details: result.details
          });
        }

        // Add policy result to request for downstream use
        req.policyResult = result;
        next();

      } catch (error) {
        console.error('Policy middleware error:', error);
        res.status(500).json({
          error: 'POLICY_EVALUATION_ERROR',
          message: 'Failed to evaluate security policy'
        });
      }
    };
  }

  /**
   * Check if request requires authorization
   */
  private requiresAuthorization(req: any): boolean {
    const sensitiveOperations = [
      'export',
      'backup',
      'admin',
      'cross_tenant'
    ];

    const path = req.path.toLowerCase();
    const operation = req.headers['x-operation'] || req.body?.operation || '';

    return sensitiveOperations.some(op => 
      path.includes(op) || operation.includes(op)
    ) || req.method === 'DELETE';
  }

  /**
   * Build OPA input from Express request
   */
  private buildInputFromRequest(req: any): Partial<OPAInput> {
    return {
      action: req.headers['x-operation'] || req.method.toLowerCase(),
      principal: {
        id: req.user?.id || 'anonymous',
        tenant_id: req.tenant?.id || req.headers['x-tenant-id'] || 'default',
        roles: req.user?.roles || [],
        permissions: req.user?.permissions || [],
        security_clearance: req.user?.security_clearance,
        team_id: req.user?.team_id
      },
      resource: {
        id: req.params?.id || req.body?.resource_id || 'unknown',
        type: req.headers['x-resource-type'] || req.body?.resource_type || 'unknown',
        tenant_id: req.body?.tenant_id || req.headers['x-tenant-id'] || 'default'
      },
      reason_for_access: req.headers['x-reason-for-access'] || req.body?.reason_for_access,
      export_format: req.body?.format,
      export_purpose: req.body?.purpose,
      timestamp: Date.now()
    };
  }
}

export { OPAClient, OPAInput, OPAResult };