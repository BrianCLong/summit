import { TenantSLOService, tenantSLOService } from './TenantSLOService';
import { TrustIncidentService, trustIncidentService } from './TrustIncidentService';
import { ProvenanceLedgerV2, provenanceLedger } from '../provenance/ledger';
import logger from '../utils/logger';
import { DatabaseService } from './DatabaseService'; // Adjust import if needed
import { SOC2ComplianceService } from './SOC2ComplianceService'; // If available
import pdfGenerator from '../utils/pdfGenerator';
import { Readable } from 'stream';

export interface TrustPortalStatus {
  region: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  lastUpdated: Date;
}

export interface TrustPortalSLA {
  metric: string;
  currentValue: number;
  target: number;
  status: 'compliant' | 'risk' | 'breached';
  evidenceLink?: string; // Link to provenance entry
}

export interface TrustEvidence {
  claim: string;
  source: string;
  timestamp: Date;
  verificationMethod: string;
  artifactHash: string;
  ledgerSequence: string;
}

export class TrustPortalService {
  private sloService: TenantSLOService;
  private incidentService: TrustIncidentService;
  private ledger: ProvenanceLedgerV2;
  // private complianceService: SOC2ComplianceService;

  constructor() {
    this.sloService = tenantSLOService;
    this.incidentService = trustIncidentService;
    this.ledger = provenanceLedger;
    // this.complianceService = new SOC2ComplianceService();
  }

  /**
   * Get the system status for the Trust Portal.
   * Aggregates active incidents and general availability.
   */
  public async getSystemStatus(tenantId: string): Promise<TrustPortalStatus[]> {
    // 1. Get active incidents affecting this tenant
    const incidents = await this.incidentService.getActiveIncidents();
    // Filter by tenant/region relevance (mock logic for now)

    // 2. Determine status based on incidents
    const regions = ['US-East', 'EU-West']; // Should come from tenant config

    return regions.map(region => {
      const regionIncidents = incidents.filter(i => i.affectedRegions.includes(region));
      let status: TrustPortalStatus['status'] = 'operational';

      if (regionIncidents.some(i => i.severity === 'critical')) status = 'outage';
      else if (regionIncidents.some(i => i.severity === 'major')) status = 'degraded';

      return {
        region,
        status,
        lastUpdated: new Date()
      };
    });
  }

  /**
   * Get SLA compliance data with evidence links.
   */
  public async getSLACompliance(tenantId: string): Promise<TrustPortalSLA[]> {
    const sloMetrics = await this.sloService.getTenantSLO(tenantId);
    if (!sloMetrics) return [];

    // Map metrics to trust portal format
    const availability: TrustPortalSLA = {
      metric: 'API Availability',
      currentValue: sloMetrics.sli.availability,
      target: 99.9, // This should come from config
      status: sloMetrics.slo.availabilityCompliant ? 'compliant' : 'breached',
      evidenceLink: `/api/trust/evidence/slo/${tenantId}/${sloMetrics.timestamp.getTime()}` // Virtual link
    };

    const latency: TrustPortalSLA = {
      metric: 'P95 Latency',
      currentValue: sloMetrics.sli.responseTimeP95,
      target: 800, // Config
      status: sloMetrics.slo.responseTimeCompliant ? 'compliant' : 'breached'
    };

    return [availability, latency];
  }

  /**
   * Get verifiable evidence for a specific claim or time period.
   */
  public async getRecentEvidence(tenantId: string): Promise<TrustEvidence[]> {
    // Fetch recent entries from ledger
    const entries = await this.ledger.getEntries(tenantId, { limit: 10, order: 'DESC' });

    return entries.map(entry => ({
      claim: `${entry.actionType} on ${entry.resourceType}`,
      source: entry.actorType,
      timestamp: entry.timestamp,
      verificationMethod: 'Cryptographic Hash Chain',
      artifactHash: entry.currentHash,
      ledgerSequence: entry.sequenceNumber.toString()
    }));
  }

  /**
   * Escape HTML characters to prevent injection
   */
  private escapeHtml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Export the current trust state as a PDF.
   */
  public async exportTrustReport(tenantId: string): Promise<Buffer> {
    const status = await this.getSystemStatus(tenantId);
    const slas = await this.getSLACompliance(tenantId);
    const evidence = await this.getRecentEvidence(tenantId);
    const compliance = await this.getCompliancePosture(tenantId);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1, h2 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .status-operational { color: green; }
          .status-outage { color: red; }
        </style>
      </head>
      <body>
      <h1>Trust Report for Tenant ${this.escapeHtml(tenantId)}</h1>
      <p>Generated at: ${this.escapeHtml(new Date().toISOString())}</p>

      <h2>System Status</h2>
      <ul>
        ${status.map(s => `<li>${this.escapeHtml(s.region)}: <span class="status-${this.escapeHtml(s.status)}">${this.escapeHtml(s.status)}</span></li>`).join('')}
      </ul>

      <h2>Compliance Posture</h2>
      <ul>
         <li>Data Residency: ${this.escapeHtml(compliance.dataResidency)}</li>
         <li>SOC2 Status: ${this.escapeHtml(compliance.soc2Status)}</li>
         <li>Last Audit: ${this.escapeHtml(compliance.lastAuditDate.toISOString())}</li>
      </ul>

      <h2>SLA Compliance</h2>
      <table>
        <tr><th>Metric</th><th>Current</th><th>Target</th><th>Status</th></tr>
        ${slas.map(s => `
          <tr>
            <td>${this.escapeHtml(s.metric)}</td>
            <td>${this.escapeHtml(s.currentValue.toString())}</td>
            <td>${this.escapeHtml(s.target.toString())}</td>
            <td>${this.escapeHtml(s.status)}</td>
          </tr>
        `).join('')}
      </table>

      <h2>Recent Evidence</h2>
       <table>
        <tr><th>Claim</th><th>Hash</th><th>Timestamp</th></tr>
        ${evidence.map(e => `
          <tr>
            <td>${this.escapeHtml(e.claim)}</td>
            <td>${this.escapeHtml(e.artifactHash.substring(0, 16))}...</td>
            <td>${this.escapeHtml(e.timestamp.toISOString())}</td>
          </tr>
        `).join('')}
      </table>
      </body>
      </html>
    `;

    // Use existing PDF generator or mock if simple HTML is enough for MVP
    // Assuming pdfGenerator.generatePDF exists and takes HTML
    // @ts-ignore
    if (pdfGenerator && pdfGenerator.generatePDF) {
      return await pdfGenerator.generatePDF(htmlContent);
    } else {
        // Fallback for mock environment
        return Buffer.from('PDF Generation Mock');
    }
  }

  /**
   * Get compliance posture (Mock implementation for now)
   */
  public async getCompliancePosture(tenantId: string): Promise<{ dataResidency: string; soc2Status: string; lastAuditDate: Date }> {
      // In production, this would query SOC2ComplianceService
      return {
          dataResidency: 'US-East (Virginia)',
          soc2Status: 'Compliant',
          lastAuditDate: new Date('2024-10-01')
      };
  }
}

export const trustPortalService = new TrustPortalService();
