// server/src/conductor/web-orchestration/compliance-gate.ts

import { Pool } from 'pg';
import { createClient } from 'redis';
import { URL } from 'url';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface RobotsPolicy {
  userAgent: string;
  allowedPaths: string[];
  disallowedPaths: string[];
  crawlDelay: number;
  requestRate?: number;
  visitTime?: string[];
  host?: string;
  cleanParam?: string[];
}

interface TOSCompliance {
  domain: string;
  lastChecked: Date;
  compliant: boolean;
  restrictions: string[];
  allowedUseCases: string[];
  robotsCompliant: boolean;
  rateLimit: number;
  attribution: boolean;
}

interface LicenseInfo {
  domain: string;
  licenseType: 'public' | 'commercial' | 'academic' | 'restricted' | 'proprietary';
  allowedUsage: string[];
  attribution: boolean;
  commercialUse: boolean;
  derivativeWorks: boolean;
  redistribution: boolean;
  lastUpdated: Date;
}

interface ComplianceCheck {
  domain: string;
  path: string;
  allowed: boolean;
  reason: string;
  restrictions: string[];
  appealPath?: string;
  policyRefs: string[];
}

export class ComplianceGate {
  private pool: Pool;
  private redis: ReturnType<typeof createClient>;
  private robotsPolicies: Map<string, RobotsPolicy>;
  private tosCompliance: Map<string, TOSCompliance>;
  private licenseInfo: Map<string, LicenseInfo>;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.redis = createClient({ url: process.env.REDIS_URL });
    this.robotsPolicies = new Map();
    this.tosCompliance = new Map();
    this.licenseInfo = new Map();
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    await this.loadComplianceData();
  }

  /**
   * Primary compliance gate - validates all aspects before web fetch
   */
  async validateWebFetch(
    url: string,
    userAgent: string = 'ConductorBot/1.0 (+https://conductor.ai/bot)',
    purpose: string,
    userId: string,
    tenantId: string
  ): Promise<ComplianceCheck> {
    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;
      const path = parsedUrl.pathname;

      const checks = await Promise.all([
        this.checkRobotsCompliance(domain, path, userAgent),
        this.checkTOSCompliance(domain, purpose),
        this.checkLicenseCompliance(domain, purpose),
        this.checkRateLimits(domain, tenantId),
        this.checkBlocklist(domain),
        this.checkPurposeBinding(domain, purpose, userId)
      ]);

      const failedChecks = checks.filter(check => !check.allowed);
      
      if (failedChecks.length > 0) {
        const complianceResult: ComplianceCheck = {
          domain,
          path,
          allowed: false,
          reason: failedChecks.map(c => c.reason).join('; '),
          restrictions: failedChecks.flatMap(c => c.restrictions || []),
          appealPath: this.generateAppealPath(domain, failedChecks),
          policyRefs: failedChecks.flatMap(c => c.policyRefs || [])
        };

        // Log denial for audit
        await this.logComplianceDecision(complianceResult, { userId, tenantId, purpose });
        
        // Update metrics
        prometheusConductorMetrics.recordOperationalEvent(
          'compliance_gate_blocked',
          false,
          { domain, reason: complianceResult.reason }
        );

        return complianceResult;
      }

      const complianceResult: ComplianceCheck = {
        domain,
        path,
        allowed: true,
        reason: 'All compliance checks passed',
        restrictions: [],
        policyRefs: ['robots.txt', 'tos', 'license']
      };

      // Log approval for audit
      await this.logComplianceDecision(complianceResult, { userId, tenantId, purpose });
      
      // Update metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'compliance_gate_allowed',
        true,
        { domain }
      );

      return complianceResult;

    } catch (error) {
      logger.error('Compliance validation failed', { 
        error: error.message, 
        url, 
        userId, 
        tenantId 
      });

      return {
        domain: new URL(url).hostname,
        path: new URL(url).pathname,
        allowed: false,
        reason: 'Compliance validation error',
        restrictions: ['validation_error'],
        policyRefs: []
      };
    }
  }

  /**
   * Check robots.txt compliance
   */
  private async checkRobotsCompliance(
    domain: string, 
    path: string, 
    userAgent: string
  ): Promise<ComplianceCheck> {
    const robotsPolicy = await this.getRobotsPolicy(domain);
    
    if (!robotsPolicy) {
      return {
        domain,
        path,
        allowed: true,
        reason: 'No robots.txt found - allowed',
        restrictions: [],
        policyRefs: []
      };
    }

    // Check if path is explicitly disallowed
    const isDisallowed = robotsPolicy.disallowedPaths.some(disallowedPath => {
      // Convert robots.txt patterns to regex
      const pattern = disallowedPath
        .replace(/\*/g, '.*')
        .replace(/\$/g, '$')
        .replace(/\^/g, '^');
      
      try {
        const regex = new RegExp(pattern);
        return regex.test(path);
      } catch {
        // Fallback to string matching if regex fails
        return path.startsWith(disallowedPath);
      }
    });

    if (isDisallowed) {
      return {
        domain,
        path,
        allowed: false,
        reason: `Path disallowed by robots.txt for ${robotsPolicy.userAgent}`,
        restrictions: ['robots_disallowed'],
        policyRefs: [`robots.txt:${domain}`],
        appealPath: `Contact ${domain} webmaster to request access`
      };
    }

    // Check crawl delay requirements
    const lastFetch = await this.getLastFetchTime(domain);
    const now = Date.now();
    const timeSinceLastFetch = now - (lastFetch || 0);
    const requiredDelay = robotsPolicy.crawlDelay * 1000; // Convert to milliseconds

    if (timeSinceLastFetch < requiredDelay) {
      return {
        domain,
        path,
        allowed: false,
        reason: `Crawl delay not satisfied. Required: ${robotsPolicy.crawlDelay}s`,
        restrictions: ['crawl_delay'],
        policyRefs: [`robots.txt:${domain}`]
      };
    }

    return {
      domain,
      path,
      allowed: true,
      reason: 'Robots.txt compliance verified',
      restrictions: [],
      policyRefs: [`robots.txt:${domain}`]
    };
  }

  /**
   * Check Terms of Service compliance
   */
  private async checkTOSCompliance(domain: string, purpose: string): Promise<ComplianceCheck> {
    const tos = this.tosCompliance.get(domain);
    
    if (!tos) {
      // Conservative approach - block if no TOS info
      return {
        domain,
        path: '',
        allowed: false,
        reason: 'Terms of Service not evaluated for this domain',
        restrictions: ['tos_unknown'],
        policyRefs: [],
        appealPath: 'Request TOS evaluation for this domain'
      };
    }

    if (!tos.compliant) {
      return {
        domain,
        path: '',
        allowed: false,
        reason: 'Domain TOS prohibits automated access',
        restrictions: tos.restrictions,
        policyRefs: [`tos:${domain}`],
        appealPath: 'Contact domain owner for API access'
      };
    }

    // Check if purpose is allowed
    if (tos.allowedUseCases.length > 0 && !tos.allowedUseCases.includes(purpose)) {
      return {
        domain,
        path: '',
        allowed: false,
        reason: `Purpose '${purpose}' not allowed by TOS`,
        restrictions: ['purpose_not_allowed'],
        policyRefs: [`tos:${domain}`]
      };
    }

    return {
      domain,
      path: '',
      allowed: true,
      reason: 'TOS compliance verified',
      restrictions: [],
      policyRefs: [`tos:${domain}`]
    };
  }

  /**
   * Check license compliance
   */
  private async checkLicenseCompliance(domain: string, purpose: string): Promise<ComplianceCheck> {
    const license = this.licenseInfo.get(domain);
    
    if (!license) {
      // Default to allowing public domains with restrictions
      return {
        domain,
        path: '',
        allowed: true,
        reason: 'No specific license - applying default restrictions',
        restrictions: ['attribution_required', 'non_commercial'],
        policyRefs: ['default_license']
      };
    }

    const restrictions: string[] = [];
    
    // Check attribution requirements
    if (license.attribution) {
      restrictions.push('attribution_required');
    }
    
    // Check commercial use
    if (!license.commercialUse && purpose === 'commercial') {
      return {
        domain,
        path: '',
        allowed: false,
        reason: 'Commercial use not permitted by license',
        restrictions: ['commercial_prohibited'],
        policyRefs: [`license:${domain}`]
      };
    }

    // Check allowed usage types
    if (license.allowedUsage.length > 0 && !license.allowedUsage.includes(purpose)) {
      return {
        domain,
        path: '',
        allowed: false,
        reason: `Purpose '${purpose}' not permitted by license`,
        restrictions: ['usage_not_permitted'],
        policyRefs: [`license:${domain}`]
      };
    }

    return {
      domain,
      path: '',
      allowed: true,
      reason: 'License compliance verified',
      restrictions,
      policyRefs: [`license:${domain}`]
    };
  }

  /**
   * Check rate limits
   */
  private async checkRateLimits(domain: string, tenantId: string): Promise<ComplianceCheck> {
    const rateLimitKey = `rate_limit:${domain}:${tenantId}`;
    const requestCount = await this.redis.get(rateLimitKey);
    
    const tos = this.tosCompliance.get(domain);
    const maxRequests = tos?.rateLimit || 60; // Default 60 requests per hour
    
    const currentCount = parseInt(requestCount || '0');
    
    if (currentCount >= maxRequests) {
      return {
        domain,
        path: '',
        allowed: false,
        reason: `Rate limit exceeded: ${currentCount}/${maxRequests} per hour`,
        restrictions: ['rate_limited'],
        policyRefs: ['rate_limit_policy']
      };
    }

    return {
      domain,
      path: '',
      allowed: true,
      reason: `Rate limit OK: ${currentCount}/${maxRequests}`,
      restrictions: [],
      policyRefs: ['rate_limit_policy']
    };
  }

  /**
   * Check domain blocklist
   */
  private async checkBlocklist(domain: string): Promise<ComplianceCheck> {
    const isBlocked = await this.redis.sismember('blocked_domains', domain);
    
    if (isBlocked) {
      return {
        domain,
        path: '',
        allowed: false,
        reason: 'Domain is blocked by policy',
        restrictions: ['blocked_domain'],
        policyRefs: ['domain_blocklist'],
        appealPath: 'Submit domain review request'
      };
    }

    return {
      domain,
      path: '',
      allowed: true,
      reason: 'Domain not blocked',
      restrictions: [],
      policyRefs: []
    };
  }

  /**
   * Check purpose binding
   */
  private async checkPurposeBinding(
    domain: string, 
    purpose: string, 
    userId: string
  ): Promise<ComplianceCheck> {
    // Verify user is authorized for this purpose
    const userPurposes = await this.getUserAuthorizedPurposes(userId);
    
    if (!userPurposes.includes(purpose)) {
      return {
        domain,
        path: '',
        allowed: false,
        reason: `User not authorized for purpose: ${purpose}`,
        restrictions: ['unauthorized_purpose'],
        policyRefs: ['purpose_binding_policy']
      };
    }

    return {
      domain,
      path: '',
      allowed: true,
      reason: 'Purpose binding verified',
      restrictions: [],
      policyRefs: ['purpose_binding_policy']
    };
  }

  /**
   * Fetch and parse robots.txt
   */
  private async getRobotsPolicy(domain: string): Promise<RobotsPolicy | null> {
    // Check cache first
    const cached = this.robotsPolicies.get(domain);
    if (cached) {
      return cached;
    }

    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      const response = await fetch(robotsUrl, { 
        timeout: 5000,
        headers: {
          'User-Agent': 'ConductorBot/1.0 (+https://conductor.ai/bot)'
        }
      });

      if (!response.ok) {
        logger.info('No robots.txt found', { domain, status: response.status });
        return null;
      }

      const robotsText = await response.text();
      const policy = this.parseRobotsTxt(robotsText);
      
      // Cache for 24 hours
      this.robotsPolicies.set(domain, policy);
      await this.redis.setex(`robots:${domain}`, 86400, JSON.stringify(policy));
      
      return policy;

    } catch (error) {
      logger.warn('Failed to fetch robots.txt', { domain, error: error.message });
      return null;
    }
  }

  /**
   * Parse robots.txt content
   */
  private parseRobotsTxt(content: string): RobotsPolicy {
    const lines = content.split('\n').map(line => line.trim());
    const policy: RobotsPolicy = {
      userAgent: '*',
      allowedPaths: [],
      disallowedPaths: [],
      crawlDelay: 1, // Default 1 second
    };

    let currentUserAgent = '*';
    let isRelevantSection = false;

    for (const line of lines) {
      if (line.startsWith('#') || line.length === 0) {
        continue; // Skip comments and empty lines
      }

      const [key, value] = line.split(':').map(part => part.trim());
      
      switch (key.toLowerCase()) {
        case 'user-agent':
          currentUserAgent = value;
          isRelevantSection = value === '*' || 
                             value.toLowerCase().includes('conductor') ||
                             value.toLowerCase().includes('bot');
          break;
          
        case 'disallow':
          if (isRelevantSection && value) {
            policy.disallowedPaths.push(value);
          }
          break;
          
        case 'allow':
          if (isRelevantSection && value) {
            policy.allowedPaths.push(value);
          }
          break;
          
        case 'crawl-delay':
          if (isRelevantSection && value) {
            policy.crawlDelay = Math.max(1, parseInt(value) || 1);
          }
          break;
          
        case 'request-rate':
          if (isRelevantSection && value) {
            const [rate, period] = value.split('/');
            policy.requestRate = parseInt(rate);
          }
          break;
      }
    }

    return policy;
  }

  /**
   * Load compliance data from database and cache
   */
  private async loadComplianceData(): Promise<void> {
    try {
      const client = await this.pool.connect();
      
      // Load TOS compliance data
      const tosResult = await client.query(`
        SELECT domain, last_checked, compliant, restrictions, allowed_use_cases, 
               robots_compliant, rate_limit, attribution
        FROM web_interface_compliance 
        WHERE last_checked > NOW() - INTERVAL '30 days'
      `);

      for (const row of tosResult.rows) {
        this.tosCompliance.set(row.domain, {
          domain: row.domain,
          lastChecked: row.last_checked,
          compliant: row.compliant,
          restrictions: row.restrictions || [],
          allowedUseCases: row.allowed_use_cases || [],
          robotsCompliant: row.robots_compliant,
          rateLimit: row.rate_limit || 60,
          attribution: row.attribution || false
        });
      }

      // Load license information
      const licenseResult = await client.query(`
        SELECT domain, license_type, allowed_usage, attribution, commercial_use,
               derivative_works, redistribution, last_updated
        FROM web_interface_licenses
        WHERE last_updated > NOW() - INTERVAL '90 days'
      `);

      for (const row of licenseResult.rows) {
        this.licenseInfo.set(row.domain, {
          domain: row.domain,
          licenseType: row.license_type,
          allowedUsage: row.allowed_usage || [],
          attribution: row.attribution || false,
          commercialUse: row.commercial_use || false,
          derivativeWorks: row.derivative_works || false,
          redistribution: row.redistribution || false,
          lastUpdated: row.last_updated
        });
      }

      client.release();
      
      logger.info('Compliance data loaded', {
        tosEntries: this.tosCompliance.size,
        licenseEntries: this.licenseInfo.size
      });

    } catch (error) {
      logger.error('Failed to load compliance data', { error: error.message });
    }
  }

  private async getLastFetchTime(domain: string): Promise<number | null> {
    const lastFetch = await this.redis.get(`last_fetch:${domain}`);
    return lastFetch ? parseInt(lastFetch) : null;
  }

  private async getUserAuthorizedPurposes(userId: string): Promise<string[]> {
    // Simplified - in production would query user permissions
    return ['intelligence_analysis', 'research', 'documentation'];
  }

  private generateAppealPath(domain: string, failedChecks: ComplianceCheck[]): string {
    return `Submit appeal at https://conductor.ai/compliance/appeal?domain=${domain}&checks=${failedChecks.map(c => c.reason).join(',')}`;
  }

  private async logComplianceDecision(
    decision: ComplianceCheck, 
    context: { userId: string; tenantId: string; purpose: string }
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO compliance_audit_log (
          domain, path, allowed, reason, restrictions, user_id, tenant_id, 
          purpose, policy_refs, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        decision.domain,
        decision.path,
        decision.allowed,
        decision.reason,
        JSON.stringify(decision.restrictions),
        context.userId,
        context.tenantId,
        context.purpose,
        JSON.stringify(decision.policyRefs)
      ]);
    } finally {
      client.release();
    }
  }

  /**
   * Record successful fetch to update rate limits
   */
  async recordSuccessfulFetch(domain: string, tenantId: string): Promise<void> {
    // Update last fetch time
    await this.redis.set(`last_fetch:${domain}`, Date.now().toString());
    
    // Update rate limit counter
    const rateLimitKey = `rate_limit:${domain}:${tenantId}`;
    await this.redis.multi()
      .incr(rateLimitKey)
      .expire(rateLimitKey, 3600) // 1 hour expiry
      .exec();

    prometheusConductorMetrics.recordOperationalEvent(
      'web_fetch_recorded',
      true,
      { domain, tenant_id: tenantId }
    );
  }
}