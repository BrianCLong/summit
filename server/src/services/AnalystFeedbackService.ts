import { PrismaClient } from '@prisma/client';
import winston, { Logger } from 'winston';

export interface AnalystFeedback {
  id: string;
  alertId: string;
  analystId: string;
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'escalate' | 'dismiss';
  reasonCode: string;
  rationale?: string;
  confidence: number; // 0-1 scale
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface LabelStoreEntry {
  id: string;
  alertId: string;
  label: string;
  value: any;
  source: 'analyst' | 'system' | 'ml_model';
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export class AnalystFeedbackService {
  private prisma: PrismaClient;
  private logger: winston.Logger;

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Record analyst feedback for an alert
   */
  async recordFeedback(
    feedback: Omit<AnalystFeedback, 'id' | 'createdAt'>,
  ): Promise<AnalystFeedback> {
    try {
      // PII redaction for rationale
      const redactedRationale = feedback.rationale
        ? this.redactPII(feedback.rationale)
        : undefined;

      const feedbackRecord = await this.prisma.analystFeedback.create({
        data: {
          ...feedback,
          rationale: redactedRationale,
          createdAt: new Date(),
        },
      });

      this.logger.info('Analyst feedback recorded', {
        feedbackId: feedbackRecord.id,
        alertId: feedback.alertId,
        feedbackType: feedback.feedbackType,
        analystId: feedback.analystId,
      });

      // Trigger model retraining pipeline if needed
      await this.triggerRetrainingIfNeeded(feedback.alertId);

      return feedbackRecord as AnalystFeedback;
    } catch (error) {
      this.logger.error('Failed to record analyst feedback', {
        error,
        feedback,
      });
      throw new Error('Failed to record feedback');
    }
  }

  /**
   * Store label in the label store
   */
  async storeLabel(
    label: Omit<LabelStoreEntry, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LabelStoreEntry> {
    try {
      const labelEntry = await this.prisma.labelStore.upsert({
        where: {
          alertId_label: {
            alertId: label.alertId,
            label: label.label,
          },
        },
        update: {
          value: label.value,
          confidence: label.confidence,
          updatedAt: new Date(),
          metadata: label.metadata,
        },
        create: {
          ...label,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.logger.info('Label stored', {
        labelId: labelEntry.id,
        alertId: label.alertId,
        label: label.label,
        source: label.source,
      });

      return labelEntry as LabelStoreEntry;
    } catch (error) {
      this.logger.error('Failed to store label', { error, label });
      throw new Error('Failed to store label');
    }
  }

  /**
   * Get feedback for an alert
   */
  async getFeedbackForAlert(alertId: string): Promise<AnalystFeedback[]> {
    try {
      const feedback = await this.prisma.analystFeedback.findMany({
        where: { alertId },
        orderBy: { createdAt: 'desc' },
      });

      return feedback as AnalystFeedback[];
    } catch (error) {
      this.logger.error('Failed to get feedback for alert', { error, alertId });
      throw new Error('Failed to get feedback');
    }
  }

  /**
   * Get labels for an alert
   */
  async getLabelsForAlert(alertId: string): Promise<LabelStoreEntry[]> {
    try {
      const labels = await this.prisma.labelStore.findMany({
        where: { alertId },
        orderBy: { updatedAt: 'desc' },
      });

      return labels as LabelStoreEntry[];
    } catch (error) {
      this.logger.error('Failed to get labels for alert', { error, alertId });
      throw new Error('Failed to get labels');
    }
  }

  /**
   * Generate training data for model retraining
   */
  async generateTrainingData(limit: number = 5000): Promise<any[]> {
    try {
      const feedbackWithLabels = await this.prisma.analystFeedback.findMany({
        take: limit,
        include: {
          alert: {
            include: {
              labels: true,
            },
          },
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const trainingData = feedbackWithLabels.map((feedback) => ({
        alertId: feedback.alertId,
        features: this.extractAlertFeatures(feedback.alert),
        labels: feedback.alert.labels.reduce((acc, label) => {
          acc[label.label] = label.value;
          return acc;
        }, {}),
        groundTruth: {
          feedbackType: feedback.feedbackType,
          reasonCode: feedback.reasonCode,
          confidence: feedback.confidence,
        },
        timestamp: feedback.createdAt,
      }));

      this.logger.info('Training data generated', {
        recordCount: trainingData.length,
      });

      return trainingData;
    } catch (error) {
      this.logger.error('Failed to generate training data', { error });
      throw new Error('Failed to generate training data');
    }
  }

  /**
   * Get feedback statistics for reporting
   */
  async getFeedbackStatistics(fromDate: Date, toDate: Date): Promise<any> {
    try {
      const stats = await this.prisma.analystFeedback.groupBy({
        by: ['feedbackType', 'reasonCode'],
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        _count: {
          id: true,
        },
        _avg: {
          confidence: true,
        },
      });

      const totalFeedback = stats.reduce(
        (sum, stat) => sum + stat._count.id,
        0,
      );
      const averageConfidence =
        stats.reduce((sum, stat) => sum + (stat._avg.confidence || 0), 0) /
        stats.length;

      return {
        totalFeedback,
        averageConfidence,
        breakdown: stats.map((stat) => ({
          feedbackType: stat.feedbackType,
          reasonCode: stat.reasonCode,
          count: stat._count.id,
          percentage: ((stat._count.id / totalFeedback) * 100).toFixed(2),
          avgConfidence: stat._avg.confidence,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get feedback statistics', { error });
      throw new Error('Failed to get feedback statistics');
    }
  }

  /**
   * PII redaction for text content
   */
  private redactPII(text: string): string {
    // Remove email addresses
    text = text.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      '[EMAIL_REDACTED]',
    );

    // Remove phone numbers
    text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');

    // Remove IP addresses
    text = text.replace(
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      '[IP_REDACTED]',
    );

    // Remove potential SSNs
    text = text.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN_REDACTED]');

    return text;
  }

  /**
   * Extract features from alert for training
   */
  private extractAlertFeatures(alert: any): Record<string, any> {
    return {
      severity: alert.severity,
      source: alert.source,
      attackTechniques: alert.attackTechniques || [],
      indicators: alert.indicators || [],
      assetCount: alert.assetCount || 0,
      timeOfDay: new Date(alert.createdAt).getHours(),
      dayOfWeek: new Date(alert.createdAt).getDay(),
      // Add more features as needed
    };
  }

  /**
   * Trigger model retraining pipeline if conditions are met
   */
  private async triggerRetrainingIfNeeded(alertId: string): Promise<void> {
    try {
      // Check if we have enough new feedback to trigger retraining
      const recentFeedbackCount = await this.prisma.analystFeedback.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      // Trigger retraining if we have more than 100 new feedback items
      if (recentFeedbackCount >= 100) {
        this.logger.info('Triggering model retraining', {
          recentFeedbackCount,
          alertId,
        });

        // Here you would call your ML pipeline
        // await this.mlService.triggerRetraining();
      }
    } catch (error) {
      this.logger.error('Failed to check retraining conditions', {
        error,
        alertId,
      });
    }
  }
}
