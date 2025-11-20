/**
 * Regulatory Reporting Package
 * SAR, CTR, and FBAR generation and filing
 */

import { Transaction, Alert } from '@intelgraph/transaction-monitoring';
import { AMLAlert } from '@intelgraph/aml-detection';

export enum ReportType {
  SAR = 'SAR',
  CTR = 'CTR',
  FBAR = 'FBAR',
  Form_8300 = 'Form_8300',
}

export interface SuspiciousActivityReport {
  id: string;
  type: ReportType.SAR;
  filingDate: Date;
  subject: ReportSubject;
  suspiciousActivity: SuspiciousActivity;
  transactions: Transaction[];
  narrative: string;
  filingInstitution: Institution;
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
}

export interface CurrencyTransactionReport {
  id: string;
  type: ReportType.CTR;
  filingDate: Date;
  transaction: Transaction;
  person: Person;
  institution: Institution;
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED';
}

export interface ReportSubject {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'ENTITY';
  identifiers: Record<string, string>;
  addresses: Address[];
}

export interface SuspiciousActivity {
  type: string[];
  dateRange: { start: Date; end: Date };
  totalAmount: number;
  indicators: string[];
}

export interface Institution {
  name: string;
  tin: string;
  address: Address;
  contact: Contact;
}

export interface Person {
  name: string;
  dob: Date;
  ssn?: string;
  address: Address;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Contact {
  name: string;
  phone: string;
  email: string;
}

export class SARGenerator {
  async generateSAR(alerts: Alert[], transactions: Transaction[]): Promise<SuspiciousActivityReport> {
    const narrative = this.generateNarrative(alerts, transactions);

    return {
      id: `SAR_${Date.now()}`,
      type: ReportType.SAR,
      filingDate: new Date(),
      subject: this.extractSubject(transactions),
      suspiciousActivity: this.summarizeActivity(transactions, alerts),
      transactions,
      narrative,
      filingInstitution: this.getFilingInstitution(),
      status: 'DRAFT',
    };
  }

  private generateNarrative(alerts: Alert[], transactions: Transaction[]): string {
    let narrative = 'SUSPICIOUS ACTIVITY REPORT NARRATIVE\n\n';

    narrative += 'SUMMARY:\n';
    narrative += `This report covers ${transactions.length} suspicious transactions `;
    narrative += `identified through automated monitoring systems between `;
    narrative += `${transactions[0].timestamp.toLocaleDateString()} and `;
    narrative += `${transactions[transactions.length - 1].timestamp.toLocaleDateString()}.\n\n`;

    narrative += 'SUSPICIOUS ACTIVITY INDICATORS:\n';
    for (const alert of alerts) {
      narrative += `- ${alert.type}: ${alert.reason}\n`;
    }

    narrative += '\nTRANSACTION DETAILS:\n';
    for (const tx of transactions) {
      narrative += `- ${tx.timestamp.toLocaleDateString()}: $${tx.amount.toFixed(2)} `;
      narrative += `from ${tx.sender.name} to ${tx.receiver.name}\n`;
    }

    narrative += '\nRECOMMENDATION:\n';
    narrative += 'Further investigation recommended. Potential money laundering activity detected.\n';

    return narrative;
  }

  private extractSubject(transactions: Transaction[]): ReportSubject {
    const subject = transactions[0].sender;
    return {
      id: subject.id,
      name: subject.name,
      type: subject.type === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'ENTITY',
      identifiers: {},
      addresses: [],
    };
  }

  private summarizeActivity(transactions: Transaction[], alerts: Alert[]): SuspiciousActivity {
    const timestamps = transactions.map(t => t.timestamp.getTime());
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      type: [...new Set(alerts.map(a => a.type))],
      dateRange: {
        start: new Date(Math.min(...timestamps)),
        end: new Date(Math.max(...timestamps)),
      },
      totalAmount,
      indicators: alerts.flatMap(a => [a.reason]),
    };
  }

  private getFilingInstitution(): Institution {
    return {
      name: 'Financial Institution Name',
      tin: '00-0000000',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      },
      contact: {
        name: 'Compliance Officer',
        phone: '555-0100',
        email: 'compliance@example.com',
      },
    };
  }
}

export class CTRGenerator {
  async generateCTR(transaction: Transaction): Promise<CurrencyTransactionReport> {
    return {
      id: `CTR_${Date.now()}`,
      type: ReportType.CTR,
      filingDate: new Date(),
      transaction,
      person: this.extractPerson(transaction),
      institution: this.getInstitution(),
      status: 'DRAFT',
    };
  }

  private extractPerson(transaction: Transaction): Person {
    return {
      name: transaction.sender.name,
      dob: new Date(),
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: transaction.sender.country,
      },
    };
  }

  private getInstitution(): Institution {
    return {
      name: 'Financial Institution',
      tin: '00-0000000',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      },
      contact: {
        name: 'Compliance',
        phone: '555-0100',
        email: 'compliance@example.com',
      },
    };
  }
}

export class RegulatoryFilingManager {
  private reports: Map<string, SuspiciousActivityReport | CurrencyTransactionReport> = new Map();

  async submitReport(report: SuspiciousActivityReport | CurrencyTransactionReport): Promise<void> {
    // Validate report
    this.validateReport(report);

    // Submit to FinCEN or appropriate authority
    report.status = 'SUBMITTED';
    this.reports.set(report.id, report);
  }

  async getReportStatus(reportId: string): Promise<string> {
    const report = this.reports.get(reportId);
    return report?.status || 'NOT_FOUND';
  }

  private validateReport(report: any): void {
    if (!report.narrative || report.narrative.length < 50) {
      throw new Error('Narrative is required and must be at least 50 characters');
    }
  }

  async trackComplianceMetrics(): Promise<ComplianceMetrics> {
    const reports = Array.from(this.reports.values());

    return {
      totalReports: reports.length,
      sarCount: reports.filter(r => r.type === ReportType.SAR).length,
      ctrCount: reports.filter(r => r.type === ReportType.CTR).length,
      submittedCount: reports.filter(r => r.status === 'SUBMITTED').length,
      averageFilingTime: 0,
    };
  }
}

export interface ComplianceMetrics {
  totalReports: number;
  sarCount: number;
  ctrCount: number;
  submittedCount: number;
  averageFilingTime: number;
}
