/**
 * Report Generator - Intelligence product generation
 * TRAINING/SIMULATION ONLY
 */

import { v4 as uuid } from 'uuid';

export interface IntelligenceReport {
  id: string;
  type: ReportType;
  classification: string;
  dateTimeGroup: string;
  originator: string;
  precedence: 'ROUTINE' | 'PRIORITY' | 'IMMEDIATE' | 'FLASH';

  // Report content
  subject: string;
  executiveSummary: string;
  body: ReportSection[];
  conclusions: string[];
  recommendations: string[];

  // Supporting data
  sources: ReportSource[];
  attachments: ReportAttachment[];

  // Metadata
  createdAt: Date;
  createdBy: string;
  serialNumber: string;
  references: string[];

  isSimulated: boolean;
}

export type ReportType =
  | 'SIGINT_SUMMARY'      // SIGSUM
  | 'SPOT_REPORT'         // Immediate tactical
  | 'TECHNICAL_ELINT'     // TECHELINT
  | 'NETWORK_ANALYSIS'    // Communications network
  | 'TARGET_PACKAGE'      // Comprehensive target intel
  | 'GEOLOCATION'         // Location report
  | 'PATTERN_ANALYSIS'    // Activity patterns
  | 'THREAT_ASSESSMENT';  // Threat evaluation

export interface ReportSection {
  title: string;
  content: string;
  subsections?: ReportSection[];
  figures?: Array<{
    id: string;
    caption: string;
    type: 'chart' | 'map' | 'diagram' | 'table';
    data: unknown;
  }>;
}

export interface ReportSource {
  id: string;
  type: 'SIGINT' | 'ELINT' | 'COMINT' | 'OSINT' | 'HUMINT' | 'GEOINT';
  reference: string;
  reliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  credibility: '1' | '2' | '3' | '4' | '5' | '6';
  dateTime: Date;
  summary: string;
}

export interface ReportAttachment {
  id: string;
  name: string;
  type: string;
  classification: string;
  description: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  sections: Array<{
    title: string;
    required: boolean;
    guidance: string;
  }>;
}

export class ReportGenerator {
  private reports: Map<string, IntelligenceReport> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private serialCounter: number = 1;

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    const templates: ReportTemplate[] = [
      {
        id: 'sigsum',
        name: 'SIGINT Summary',
        type: 'SIGINT_SUMMARY',
        sections: [
          { title: 'Executive Summary', required: true, guidance: 'Brief overview of key findings' },
          { title: 'Collection Summary', required: true, guidance: 'Summary of collection activities' },
          { title: 'Analysis', required: true, guidance: 'Detailed analysis of collected signals' },
          { title: 'Significant Activity', required: false, guidance: 'Notable events or patterns' },
          { title: 'Outlook', required: false, guidance: 'Assessment of future activity' }
        ]
      },
      {
        id: 'spot',
        name: 'Spot Report',
        type: 'SPOT_REPORT',
        sections: [
          { title: 'What', required: true, guidance: 'What happened/was observed' },
          { title: 'When', required: true, guidance: 'Date/time of event' },
          { title: 'Where', required: true, guidance: 'Location of event' },
          { title: 'Assessment', required: true, guidance: 'Significance and implications' }
        ]
      },
      {
        id: 'techelint',
        name: 'Technical ELINT Report',
        type: 'TECHNICAL_ELINT',
        sections: [
          { title: 'Emitter Identification', required: true, guidance: 'Emitter designation and type' },
          { title: 'Technical Parameters', required: true, guidance: 'Frequency, PRF, pulse width, etc.' },
          { title: 'Platform Assessment', required: true, guidance: 'Associated platform or system' },
          { title: 'Operational Assessment', required: false, guidance: 'Mode of operation, capability' },
          { title: 'Threat Assessment', required: false, guidance: 'Threat level and implications' }
        ]
      },
      {
        id: 'network',
        name: 'Network Analysis Report',
        type: 'NETWORK_ANALYSIS',
        sections: [
          { title: 'Network Overview', required: true, guidance: 'Network structure and components' },
          { title: 'Key Nodes', required: true, guidance: 'Central figures/systems' },
          { title: 'Communication Patterns', required: true, guidance: 'Patterns and frequencies' },
          { title: 'Link Analysis', required: true, guidance: 'Relationships between nodes' },
          { title: 'Assessment', required: true, guidance: 'Network function and significance' }
        ]
      },
      {
        id: 'geoloc',
        name: 'Geolocation Report',
        type: 'GEOLOCATION',
        sections: [
          { title: 'Location Summary', required: true, guidance: 'Coordinates and accuracy' },
          { title: 'Method', required: true, guidance: 'Geolocation technique used' },
          { title: 'Supporting Data', required: true, guidance: 'Signals and measurements' },
          { title: 'Confidence Assessment', required: true, guidance: 'Location confidence' },
          { title: 'Historical Context', required: false, guidance: 'Previous locations if applicable' }
        ]
      }
    ];

    templates.forEach(t => this.templates.set(t.id, t));
  }

  /**
   * Generate a report from collected data
   */
  generateReport(params: {
    type: ReportType;
    classification: string;
    subject: string;
    data: {
      signals?: unknown[];
      messages?: unknown[];
      locations?: unknown[];
      networks?: unknown;
      emitters?: unknown[];
    };
    originator?: string;
    precedence?: IntelligenceReport['precedence'];
  }): IntelligenceReport {
    const report: IntelligenceReport = {
      id: uuid(),
      type: params.type,
      classification: params.classification,
      dateTimeGroup: this.formatDTG(new Date()),
      originator: params.originator || 'SIGINT-TRAINING',
      precedence: params.precedence || 'ROUTINE',
      subject: params.subject,
      executiveSummary: this.generateExecutiveSummary(params.type, params.data),
      body: this.generateBody(params.type, params.data),
      conclusions: this.generateConclusions(params.type, params.data),
      recommendations: this.generateRecommendations(params.type, params.data),
      sources: this.generateSources(params.data),
      attachments: [],
      createdAt: new Date(),
      createdBy: 'SYSTEM',
      serialNumber: this.generateSerialNumber(params.type),
      references: [],
      isSimulated: true
    };

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(type: ReportType, data: unknown): string {
    switch (type) {
      case 'SIGINT_SUMMARY':
        return `[SIMULATED] This SIGINT summary covers collection activities during the reporting period. Key findings include signal activity analysis and target communications assessment.`;
      case 'SPOT_REPORT':
        return `[SIMULATED] Immediate report of significant activity detected during training exercise.`;
      case 'TECHNICAL_ELINT':
        return `[SIMULATED] Technical analysis of detected radar/electronic emissions including parametric data and platform assessment.`;
      case 'NETWORK_ANALYSIS':
        return `[SIMULATED] Analysis of communications network structure, key nodes, and operational patterns.`;
      case 'GEOLOCATION':
        return `[SIMULATED] Geolocation report providing estimated position of signal source with confidence assessment.`;
      default:
        return `[SIMULATED] Intelligence report generated for training purposes.`;
    }
  }

  /**
   * Generate report body sections
   */
  private generateBody(type: ReportType, data: any): ReportSection[] {
    const template = Array.from(this.templates.values()).find(t => t.type === type);
    if (!template) return [];

    return template.sections.map(section => ({
      title: section.title,
      content: this.generateSectionContent(section.title, type, data)
    }));
  }

  /**
   * Generate section content
   */
  private generateSectionContent(sectionTitle: string, type: ReportType, data: any): string {
    // Generate appropriate simulated content based on section
    const contentMap: Record<string, string> = {
      'Executive Summary': `[SIMULATED] Overview of key intelligence findings from this training scenario.`,
      'Collection Summary': `[SIMULATED] During the reporting period, ${data.signals?.length || 0} signals were collected and ${data.messages?.length || 0} communications were analyzed.`,
      'Analysis': `[SIMULATED] Analysis indicates normal activity patterns consistent with training scenario parameters. Signal characteristics match expected profiles.`,
      'Significant Activity': `[SIMULATED] No anomalous activity detected. All observations within expected parameters for training exercise.`,
      'Outlook': `[SIMULATED] Continued monitoring recommended to establish baseline patterns.`,
      'What': `[SIMULATED] Signal activity detected matching target profile indicators.`,
      'When': `[SIMULATED] ${new Date().toISOString()}`,
      'Where': `[SIMULATED] Training exercise geographic area.`,
      'Emitter Identification': `[SIMULATED] Emitter designator: TRAINING-RADAR-001. Classification: Search Radar.`,
      'Technical Parameters': `[SIMULATED] Frequency: 9.4 GHz, PRF: 1000 Hz, Pulse Width: 1.0 μs, Scan Rate: 15 rpm.`,
      'Platform Assessment': `[SIMULATED] Ground-based platform. Fixed installation.`,
      'Network Overview': `[SIMULATED] Communications network consisting of ${data.networks?.nodes?.length || 5} identified nodes.`,
      'Key Nodes': `[SIMULATED] Central node identified with highest betweenness centrality.`,
      'Communication Patterns': `[SIMULATED] Regular communication intervals observed with peak activity during exercise hours.`,
      'Link Analysis': `[SIMULATED] Strong links identified between primary and secondary nodes.`,
      'Location Summary': `[SIMULATED] Estimated position: Training Area (coordinates withheld). CEP: 100m.`,
      'Method': `[SIMULATED] TDOA geolocation using 3 sensor inputs.`,
      'Supporting Data': `[SIMULATED] Time difference measurements from distributed sensor network.`,
      'Confidence Assessment': `[SIMULATED] Moderate confidence based on sensor geometry and measurement quality.`
    };

    return contentMap[sectionTitle] || `[SIMULATED] Content for ${sectionTitle} section.`;
  }

  /**
   * Generate conclusions
   */
  private generateConclusions(type: ReportType, data: unknown): string[] {
    return [
      '[SIMULATED] Training data collected and analyzed successfully.',
      '[SIMULATED] Collection systems performed within expected parameters.',
      '[SIMULATED] Analysis techniques validated against known scenarios.'
    ];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(type: ReportType, data: unknown): string[] {
    return [
      '[SIMULATED] Continue collection operations per exercise timeline.',
      '[SIMULATED] Maintain current sensor configuration.',
      '[SIMULATED] Prepare follow-on analysis as additional data becomes available.'
    ];
  }

  /**
   * Generate source citations
   */
  private generateSources(data: any): ReportSource[] {
    const sources: ReportSource[] = [];

    if (data.signals?.length > 0) {
      sources.push({
        id: uuid(),
        type: 'SIGINT',
        reference: 'TRAINING-SIGINT-001',
        reliability: 'B',
        credibility: '2',
        dateTime: new Date(),
        summary: 'Signal collection from training scenario'
      });
    }

    if (data.messages?.length > 0) {
      sources.push({
        id: uuid(),
        type: 'COMINT',
        reference: 'TRAINING-COMINT-001',
        reliability: 'B',
        credibility: '2',
        dateTime: new Date(),
        summary: 'Communications analysis from training scenario'
      });
    }

    if (data.emitters?.length > 0) {
      sources.push({
        id: uuid(),
        type: 'ELINT',
        reference: 'TRAINING-ELINT-001',
        reliability: 'B',
        credibility: '2',
        dateTime: new Date(),
        summary: 'Electronic emissions analysis from training scenario'
      });
    }

    return sources;
  }

  /**
   * Format date-time group
   */
  private formatDTG(date: Date): string {
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear().toString().slice(-2);

    return `${day}${hours}${minutes}Z ${month} ${year}`;
  }

  /**
   * Generate serial number
   */
  private generateSerialNumber(type: ReportType): string {
    const prefix = type.substring(0, 3).toUpperCase();
    const num = (this.serialCounter++).toString().padStart(4, '0');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${prefix}-${date}-${num}`;
  }

  /**
   * Export report to formatted text
   */
  exportReport(reportId: string): string {
    const report = this.reports.get(reportId);
    if (!report) return '';

    let output = `
═══════════════════════════════════════════════════════════════════
                    INTELLIGENCE REPORT
═══════════════════════════════════════════════════════════════════
CLASSIFICATION: ${report.classification}
SERIAL NUMBER: ${report.serialNumber}
DTG: ${report.dateTimeGroup}
ORIGINATOR: ${report.originator}
PRECEDENCE: ${report.precedence}
───────────────────────────────────────────────────────────────────
SUBJECT: ${report.subject}
───────────────────────────────────────────────────────────────────

EXECUTIVE SUMMARY
─────────────────
${report.executiveSummary}

`;

    for (const section of report.body) {
      output += `
${section.title.toUpperCase()}
${'─'.repeat(section.title.length)}
${section.content}
`;
    }

    output += `
CONCLUSIONS
───────────
${report.conclusions.map((c, i) => `${i + 1}. ${c}`).join('\n')}

RECOMMENDATIONS
───────────────
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

SOURCES
───────
${report.sources.map(s => `- ${s.type}: ${s.reference} (${s.reliability}${s.credibility})`).join('\n')}

═══════════════════════════════════════════════════════════════════
                    END OF REPORT
═══════════════════════════════════════════════════════════════════
*** TRAINING DOCUMENT - SIMULATED DATA ***
`;

    return output;
  }

  /**
   * Get all reports
   */
  getReports(): IntelligenceReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Get report by ID
   */
  getReport(id: string): IntelligenceReport | undefined {
    return this.reports.get(id);
  }

  /**
   * Get available templates
   */
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }
}
