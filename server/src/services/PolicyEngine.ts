import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import { join } from 'path';
import yaml from 'js-yaml';
import { AdvancedAuditSystem } from '../audit/advanced-audit-system.js';
import { AppError } from '../lib/errors.js';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define Policy Interface
export interface PolicyContext {
  environment: string;
  user: {
    id: string;
    role: string;
    permissions: string[];
    clearance_level?: number;
    tenantId: string;
  };
  action: string;
  resource: {
    id?: string;
    type: string;
    sensitivity?: string;
    [key: string]: any;
  };
}

export interface PolicyDecision {
  allow: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

export class PolicyEngine extends EventEmitter {
  private static instance: PolicyEngine;
  private config: any;
  private auditSystem: AdvancedAuditSystem;
  private initialized: boolean = false;
  private opaUrl: string = 'http://localhost:8181/v1/data/governance/allow';

  private constructor() {
    super();
    // Use getInstance without params, assuming it's already initialized by the main app
    // or fallback to lazy initialization if possible
    try {
        this.auditSystem = AdvancedAuditSystem.getInstance();
    } catch (e) {
        // If not initialized, we can't really log audits effectively yet.
        // We'll let it fail or log to console.
        console.warn('PolicyEngine: AuditSystem not ready', e);
    }
  }

  public static getInstance(): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine();
    }
    return PolicyEngine.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Use process.cwd() to be safe against location changes
      const configPath = join(process.cwd(), 'policy/governance-config.yaml');

      try {
          const fileContents = await readFile(configPath, 'utf8');
          this.config = yaml.load(fileContents);
          console.log('PolicyEngine loaded configuration from', configPath);
      } catch (e) {
          console.warn('PolicyEngine could not load config file from', configPath, e);
          // Fallback
           this.config = {
            environments: {
              dev: { mode: 'permissive', enforce: false },
              staging: { mode: 'strict', enforce: true },
              prod: { mode: 'strict', enforce: true }
            }
          };
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize PolicyEngine', error);
      throw error;
    }
  }

  /**
   * Evaluate a policy decision
   */
  public async evaluate(context: PolicyContext): Promise<PolicyDecision> {
    if (!this.initialized) await this.initialize();

    // Determine environment mode
    const env = context.environment || process.env.NODE_ENV || 'dev';
    const envConfig = this.config?.environments?.[env] || this.config?.environments?.dev;

    // Try OPA first
    let decision: PolicyDecision;
    try {
        decision = await this.queryOpa(context);
    } catch (e) {
        // Fallback to simulation if OPA is not available
        decision = this.simulateRegoEvaluation(context, envConfig);
    }

    // Audit Log
    if (this.auditSystem) {
        try {
            await this.auditSystem.log(
            { id: context.user.id, type: 'user', role: context.user.role, tenantId: context.user.tenantId },
            context.action,
            { id: context.resource.id || 'unknown', type: context.resource.type },
            { ...context, decision },
            { decision: decision.allow ? 'ALLOW' : 'DENY' }
            );
        } catch (e) {
            console.error('Failed to log audit event', e);
        }
    }

    return decision;
  }

  private async queryOpa(context: PolicyContext): Promise<PolicyDecision> {
      return new Promise((resolve, reject) => {
          const data = JSON.stringify({ input: context });
          const req = http.request(this.opaUrl, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': data.length
              },
              timeout: 200 // fast timeout for sidecar
          }, (res) => {
              if (res.statusCode !== 200) {
                  reject(new Error(`OPA returned ${res.statusCode}`));
                  return;
              }
              let body = '';
              res.on('data', chunk => body += chunk);
              res.on('end', () => {
                  try {
                      const result = JSON.parse(body);
                      // OPA result format: { result: boolean } or { result: { allow: boolean, ... } }
                      if (result.result === true || result.result === false) {
                          resolve({ allow: result.result });
                      } else if (result.result && typeof result.result.allow === 'boolean') {
                          resolve({ allow: result.result.allow, reason: result.result.reason });
                      } else {
                          // If undefined, default to deny
                          resolve({ allow: false, reason: 'OPA result undefined' });
                      }
                  } catch (e) {
                      reject(e);
                  }
              });
          });

          req.on('error', (e) => reject(e));
          req.write(data);
          req.end();
      });
  }

  private simulateRegoEvaluation(context: PolicyContext, envConfig: any): PolicyDecision {
    // Logic matching governance.rego

    // 1. Admin Bypass
    if (context.user.role === 'admin') {
      return { allow: true, reason: 'Admin bypass' };
    }

    // 2. Dev Environment Permissiveness
    if (envConfig && envConfig.mode === 'permissive') {
        if (context.environment === 'dev') {
            return { allow: true, reason: 'Dev environment permissive' };
        }
    }

    // 3. Compliance Blocks
    if (context.resource.sensitivity === 'TOP_SECRET' && (context.user.clearance_level || 0) < 5) {
      return { allow: false, reason: 'Insufficient clearance for TOP_SECRET' };
    }

    // 4. Permission Check
    if (context.user.permissions && context.user.permissions.includes(context.action)) {
        // 5. Runtime Checks
        if (context.action === 'copilot_query') {
            const query = context.resource.query || '';
            if (/ssn|credit card/i.test(query)) {
                return { allow: false, reason: 'PII detected in query' };
            }
        }
        return { allow: true };
    }

    return { allow: false, reason: 'Insufficient permissions' };
  }

  /**
   * Express Middleware for Policy Enforcement
   */
  public middleware(action: string, resourceType: string) {
    return async (req: any, res: any, next: any) => {
      try {
        if (!req.user) {
          return next(new AppError('Unauthorized', 401));
        }

        const context: PolicyContext = {
          environment: process.env.NODE_ENV || 'dev',
          user: req.user,
          action,
          resource: {
            type: resourceType,
            ...req.params,
            ...req.body
          }
        };

        const decision = await this.evaluate(context);

        if (!decision.allow) {
          return next(new AppError(`Policy Violation: ${decision.reason}`, 403));
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
