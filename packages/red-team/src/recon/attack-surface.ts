import {
  AttackSurface,
  SurfaceAsset,
  Exposure
} from '../types.js';

/**
 * Attack Surface Mapper
 */
export class AttackSurfaceMapper {
  /**
   * Perform network reconnaissance
   */
  async performReconnaissance(
    target: string,
    options: {
      includeSubdomains?: boolean;
      includePorts?: boolean;
      includeServices?: boolean;
      includeCertificates?: boolean;
      includeCloudAssets?: boolean;
    } = {}
  ): Promise<AttackSurface> {
    const {
      includeSubdomains = true,
      includePorts = true,
      includeServices = true,
      includeCertificates = true,
      includeCloudAssets = true
    } = options;

    const assets: SurfaceAsset[] = [];
    const exposures: Exposure[] = [];

    // Enumerate subdomains
    if (includeSubdomains) {
      const subdomains = await this.enumerateSubdomains(target);
      assets.push(...subdomains);
    }

    // Scan ports and services
    if (includePorts && includeServices) {
      const services = await this.scanServices(target);
      assets.push(...services);
    }

    // Analyze SSL/TLS certificates
    if (includeCertificates) {
      const certs = await this.analyzeCertificates(target);
      assets.push(...certs);
    }

    // Discover Cloud Assets (S3, etc.)
    if (includeCloudAssets) {
      const cloudAssets = await this.discoverCloudAssets('aws', { target }); // Defaulting to AWS simulation
      const s3Buckets = await this.discoverS3Buckets(target);
      assets.push(...cloudAssets, ...s3Buckets);
    }

    // Enrich with Vulnerabilities (CVEs)
    await this.enrichWithVulnerabilities(assets);

    // Identify exposures
    exposures.push(...await this.identifyExposures(assets));

    // Calculate risk score
    const riskScore = this.calculateRiskScore(exposures);

    return {
      id: this.generateId(),
      organizationId: target,
      lastScan: new Date(),
      assets,
      exposures,
      riskScore
    };
  }

  /**
   * Enumerate subdomains
   */
  private async enumerateSubdomains(domain: string): Promise<SurfaceAsset[]> {
    // Simulated subdomain enumeration
    const commonSubdomains = [
      'www', 'mail', 'ftp', 'admin', 'api', 'dev', 'staging',
      'test', 'blog', 'shop', 'portal', 'vpn', 'remote', 'app'
    ];

    const assets: SurfaceAsset[] = [];
    const now = new Date();

    for (const sub of commonSubdomains) {
      assets.push({
        id: this.generateId(),
        type: 'domain',
        identifier: `${sub}.${domain}`,
        firstSeen: now,
        lastSeen: now,
        attributes: {
          recordType: 'A',
          dnssec: false
        },
        risks: []
      });
    }

    return assets;
  }

  /**
   * Scan services
   */
  private async scanServices(target: string): Promise<SurfaceAsset[]> {
    // Simulated service scan results with versions for CVE detection
    const commonServices = [
      { port: 22, service: 'SSH', version: 'OpenSSH 7.2p2', risk: 'medium' },
      { port: 80, service: 'HTTP', version: 'Apache 2.4.49', risk: 'low' }, // Intentionally vulnerable version for simulation
      { port: 443, service: 'HTTPS', version: 'nginx 1.18.0', risk: 'low' },
      { port: 3306, service: 'MySQL', version: '5.7.31', risk: 'high' },
      { port: 5432, service: 'PostgreSQL', version: '12.4', risk: 'high' },
      { port: 6379, service: 'Redis', version: '5.0.7', risk: 'critical' },
      { port: 27017, service: 'MongoDB', version: '4.2.8', risk: 'critical' }
    ];

    const assets: SurfaceAsset[] = [];
    const now = new Date();

    for (const svc of commonServices) {
      assets.push({
        id: this.generateId(),
        type: 'service',
        identifier: `${target}:${svc.port}`,
        firstSeen: now,
        lastSeen: now,
        attributes: {
          port: svc.port,
          service: svc.service,
          version: svc.version,
          protocol: 'TCP'
        },
        risks: [{
          id: this.generateId(),
          category: 'exposure',
          score: svc.risk === 'critical' ? 9 : svc.risk === 'high' ? 7 : svc.risk === 'medium' ? 5 : 3,
          factors: [`${svc.service} exposed on port ${svc.port}`]
        }]
      });
    }

    return assets;
  }

  /**
   * Analyze SSL/TLS certificates
   */
  private async analyzeCertificates(target: string): Promise<SurfaceAsset[]> {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return [{
      id: this.generateId(),
      type: 'certificate',
      identifier: `*.${target}`,
      firstSeen: now,
      lastSeen: now,
      attributes: {
        issuer: 'Let\'s Encrypt',
        validFrom: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        validTo: expiryDate,
        keySize: 2048,
        signatureAlgorithm: 'SHA256withRSA',
        subjectAlternativeNames: [target, `*.${target}`]
      },
      risks: expiryDate.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000
        ? [{
            id: this.generateId(),
            category: 'certificate',
            score: 6,
            factors: ['Certificate expiring soon']
          }]
        : []
    }];
  }

  /**
   * Identify exposures from assets
   */
  private async identifyExposures(assets: SurfaceAsset[]): Promise<Exposure[]> {
    const exposures: Exposure[] = [];

    for (const asset of assets) {
      if (asset.type === 'service') {
        const port = asset.attributes['port'] as number;
        const service = asset.attributes['service'] as string;

        // Check for dangerous exposed services
        if ([3306, 5432, 6379, 27017].includes(port)) {
          exposures.push({
            id: this.generateId(),
            assetId: asset.id,
            type: 'open-port',
            severity: 'critical',
            description: `Database service ${service} exposed to internet on port ${port}`,
            remediation: `Restrict access to ${service} using firewall rules and VPN`
          });
        }

        // Check for unencrypted services
        if (port === 80) {
          exposures.push({
            id: this.generateId(),
            assetId: asset.id,
            type: 'misconfiguration',
            severity: 'medium',
            description: 'HTTP service without HTTPS redirect',
            remediation: 'Configure automatic HTTPS redirect'
          });
        }

        // Map CVE risks to exposures
        const cveRisks = asset.risks.filter(r => r.category === 'vulnerability');
        for (const risk of cveRisks) {
           exposures.push({
             id: this.generateId(),
             assetId: asset.id,
             type: 'vulnerable-service',
             severity: risk.score >= 9 ? 'critical' : risk.score >= 7 ? 'high' : 'medium',
             description: `Vulnerable service detected: ${risk.factors.join(', ')}`,
             remediation: 'Patch the service to the latest version immediately.'
           });
        }
      }

      if (asset.type === 'certificate' && asset.risks.length > 0) {
        exposures.push({
          id: this.generateId(),
          assetId: asset.id,
          type: 'misconfiguration',
          severity: 'medium',
          description: 'SSL/TLS certificate expiring soon',
          remediation: 'Renew SSL/TLS certificate before expiry'
        });
      }

      if (asset.type === 'cloud-resource') {
        const cloudRisks = asset.risks.filter(r => r.category === 'cloud');
        for (const risk of cloudRisks) {
          exposures.push({
            id: this.generateId(),
            assetId: asset.id,
            type: 'misconfiguration',
            severity: risk.score >= 7 ? 'high' : 'medium',
            description: `Cloud Misconfiguration: ${risk.factors.join(', ')}`,
            remediation: 'Review cloud resource permissions and restrict access.'
          });
        }
      }
    }

    return exposures;
  }

  /**
   * Discover S3 Buckets
   */
  async discoverS3Buckets(target: string): Promise<SurfaceAsset[]> {
    const commonBuckets = [
      'backup', 'logs', 'assets', 'static', 'internal', 'confidential', 'data', 'secure'
    ];
    const assets: SurfaceAsset[] = [];
    const now = new Date();

    // Simulate finding some buckets
    for (const suffix of commonBuckets) {
      // Deterministic simulation based on target string
      const bucketName = `${target.replace(/\./g, '-')}-${suffix}`;
      const isOpen = (target.length + suffix.length) % 5 === 0; // consistent simulation

      if (isOpen) {
         assets.push({
             id: this.generateId(),
             type: 'cloud-resource',
             identifier: `s3://${bucketName}`,
             firstSeen: now,
             lastSeen: now,
             attributes: {
                 provider: 'aws',
                 resourceType: 'storage',
                 publicAccess: true,
                 region: 'us-east-1'
             },
             risks: [{
                 id: this.generateId(),
                 category: 'cloud',
                 score: 8,
                 factors: [`Public S3 bucket found: ${bucketName}`]
             }]
         });
      }
    }
    return assets;
  }

  /**
   * Enrich assets with vulnerabilities (CVEs)
   */
  private async enrichWithVulnerabilities(assets: SurfaceAsset[]): Promise<void> {
    // Mock CVE Database
    const cveDb: Record<string, { cve: string, score: number, desc: string }[]> = {
      'Apache 2.4.49': [{ cve: 'CVE-2021-41773', score: 9.8, desc: 'Path traversal vulnerability' }],
      'Redis 5.0.7': [{ cve: 'CVE-2022-0543', score: 10.0, desc: 'Lua sandbox escape' }],
      'OpenSSH 7.2p2': [{ cve: 'CVE-2016-0777', score: 7.1, desc: 'Roaming support information leak' }]
    };

    for (const asset of assets) {
      if (asset.type === 'service' && asset.attributes['version']) {
        const version = asset.attributes['version'] as string;
        const vulnerabilities = cveDb[version];

        if (vulnerabilities) {
           for (const vuln of vulnerabilities) {
             asset.risks.push({
               id: this.generateId(),
               category: 'vulnerability',
               score: vuln.score,
               factors: [`${vuln.cve}: ${vuln.desc}`]
             });
           }
        }
      }
    }
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(exposures: Exposure[]): number {
    const severityScores: Record<string, number> = {
      'critical': 10,
      'high': 7,
      'medium': 4,
      'low': 1
    };

    if (exposures.length === 0) {return 0;}

    const totalScore = exposures.reduce((sum, exp) => {
      return sum + (severityScores[exp.severity] || 0);
    }, 0);

    return Math.min(10, totalScore / exposures.length);
  }

  /**
   * Discover cloud assets
   */
  async discoverCloudAssets(
    cloudProvider: 'aws' | 'azure' | 'gcp',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config: Record<string, string>
  ): Promise<SurfaceAsset[]> {
    // Simulated cloud asset discovery
    const now = new Date();

    return [
      {
        id: this.generateId(),
        type: 'cloud-resource',
        identifier: `${cloudProvider}://storage-bucket-001`,
        firstSeen: now,
        lastSeen: now,
        attributes: {
          provider: cloudProvider,
          resourceType: 'storage',
          region: 'us-east-1',
          publicAccess: true
        },
        risks: [{
          id: this.generateId(),
          category: 'cloud',
          score: 8,
          factors: ['Public storage bucket detected']
        }]
      },
      {
        id: this.generateId(),
        type: 'cloud-resource',
        identifier: `${cloudProvider}://compute-instance-001`,
        firstSeen: now,
        lastSeen: now,
        attributes: {
          provider: cloudProvider,
          resourceType: 'compute',
          region: 'us-east-1',
          publicIP: '203.0.113.1'
        },
        risks: []
      }
    ];
  }

  /**
   * Discover API endpoints
   */
  async discoverAPIEndpoints(
    baseUrl: string
  ): Promise<SurfaceAsset[]> {
    const commonEndpoints = [
      '/api/v1/users',
      '/api/v1/auth',
      '/api/v1/admin',
      '/api/health',
      '/graphql',
      '/swagger.json',
      '/openapi.json'
    ];

    const now = new Date();
    const assets: SurfaceAsset[] = [];

    for (const endpoint of commonEndpoints) {
      assets.push({
        id: this.generateId(),
        type: 'application',
        identifier: `${baseUrl}${endpoint}`,
        firstSeen: now,
        lastSeen: now,
        attributes: {
          endpoint,
          method: 'GET',
          authenticated: endpoint.includes('admin')
        },
        risks: endpoint.includes('swagger') || endpoint.includes('openapi')
          ? [{
              id: this.generateId(),
              category: 'information-disclosure',
              score: 5,
              factors: ['API documentation publicly accessible']
            }]
          : []
      });
    }

    return assets;
  }

  private generateId(): string {
    return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
