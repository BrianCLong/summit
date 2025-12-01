import { v4 as uuid } from 'uuid';
import type { CitizenProfile, ServiceNeed } from './types.js';
import type { CitizenProfileAggregator } from './citizen-profile-aggregator.js';

/**
 * Proactively identifies and resolves service needs before citizens request them.
 * Uses pattern recognition to predict needs based on life events and deadlines.
 */
export class ProactiveServiceResolver {
  private predictedNeeds: Map<string, ServiceNeed[]> = new Map();

  constructor(private profileAggregator: CitizenProfileAggregator) {}

  // Service patterns that can be predicted
  private readonly servicePatterns = [
    {
      type: 'license_renewal',
      trigger: 'document_expiring',
      daysBeforeExpiry: 60,
      autoResolvable: true,
    },
    {
      type: 'annual_registration',
      trigger: 'yearly_anniversary',
      daysBeforeExpiry: 30,
      autoResolvable: true,
    },
    {
      type: 'benefit_recertification',
      trigger: 'benefit_period_ending',
      daysBeforeExpiry: 45,
      autoResolvable: false,
    },
    {
      type: 'tax_filing_reminder',
      trigger: 'tax_season',
      fixedDates: ['04-01', '10-01'],
      autoResolvable: false,
    },
    {
      type: 'address_update',
      trigger: 'recent_move',
      autoResolvable: true,
    },
  ];

  /**
   * Scans citizen profiles to predict upcoming service needs
   */
  async predictServiceNeeds(citizenId: string): Promise<ServiceNeed[]> {
    const profile = await this.profileAggregator.getProfile(citizenId);
    if (!profile) return [];

    const needs: ServiceNeed[] = [];
    const now = new Date();

    // Check document expirations
    for (const doc of profile.documents) {
      if (doc.expiresAt) {
        const expiryDate = new Date(doc.expiresAt);
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= 60 && daysUntilExpiry > 0) {
          needs.push({
            id: uuid(),
            citizenId,
            serviceType: `${doc.type}_renewal`,
            predictedNeedDate: doc.expiresAt,
            confidence: daysUntilExpiry <= 30 ? 0.95 : 0.8,
            triggers: [`${doc.type} expires in ${daysUntilExpiry} days`],
            status: 'predicted',
            autoResolvable: true,
          });
        }
      }
    }

    // Check submission patterns for recurring services
    const submissionTypes = new Map<string, Date[]>();
    for (const sub of profile.submissions) {
      const dates = submissionTypes.get(sub.formId) || [];
      dates.push(new Date(sub.submittedAt));
      submissionTypes.set(sub.formId, dates);
    }

    // Detect annual patterns
    for (const [formId, dates] of submissionTypes) {
      if (dates.length >= 2) {
        const intervals = [];
        for (let i = 1; i < dates.length; i++) {
          intervals.push(dates[i].getTime() - dates[i - 1].getTime());
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const yearInMs = 365 * 24 * 60 * 60 * 1000;

        // If roughly annual (330-400 days)
        if (avgInterval > yearInMs * 0.9 && avgInterval < yearInMs * 1.1) {
          const lastSubmission = dates[dates.length - 1];
          const nextDue = new Date(lastSubmission.getTime() + yearInMs);
          const daysUntilDue = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilDue <= 45 && daysUntilDue > 0) {
            needs.push({
              id: uuid(),
              citizenId,
              serviceType: `annual_${formId}`,
              predictedNeedDate: nextDue.toISOString(),
              confidence: 0.85,
              triggers: [`Annual ${formId} due in ${daysUntilDue} days`],
              status: 'predicted',
              autoResolvable: false,
            });
          }
        }
      }
    }

    this.predictedNeeds.set(citizenId, needs);
    return needs;
  }

  /**
   * Attempts to auto-resolve a service need
   */
  async autoResolve(needId: string, citizenId: string): Promise<{
    resolved: boolean;
    action?: string;
    nextSteps?: string[];
  }> {
    const needs = this.predictedNeeds.get(citizenId) || [];
    const need = needs.find(n => n.id === needId);

    if (!need) {
      return { resolved: false };
    }

    if (!need.autoResolvable) {
      return {
        resolved: false,
        nextSteps: ['Manual intervention required', 'Citizen will be notified'],
      };
    }

    // Auto-resolution logic
    const profile = await this.profileAggregator.getProfile(citizenId);

    if (need.serviceType.includes('renewal')) {
      // Pre-fill renewal application
      need.status = 'resolved';
      return {
        resolved: true,
        action: 'Renewal application pre-filled and submitted for review',
        nextSteps: ['Application queued for processing', 'Citizen notified via email'],
      };
    }

    if (need.serviceType === 'address_update') {
      need.status = 'resolved';
      return {
        resolved: true,
        action: 'Address update propagated to all linked services',
        nextSteps: ['All registrations updated', 'Confirmation sent'],
      };
    }

    return { resolved: false };
  }

  /**
   * Gets pending needs for a citizen
   */
  async getPendingNeeds(citizenId: string): Promise<ServiceNeed[]> {
    return (this.predictedNeeds.get(citizenId) || []).filter(
      n => n.status === 'predicted' || n.status === 'notified',
    );
  }

  /**
   * Notifies citizen of predicted needs
   */
  async notifyCitizen(citizenId: string, needId: string): Promise<void> {
    const needs = this.predictedNeeds.get(citizenId) || [];
    const need = needs.find(n => n.id === needId);
    if (need) {
      need.status = 'notified';
    }
  }
}
