/**
 * Report dissemination and distribution management
 */

import { v4 as uuidv4 } from 'uuid';

export type DistributionMethod = 'EMAIL' | 'PORTAL' | 'SFTP' | 'API' | 'DOWNLOAD';

export interface DistributionRecord {
  id: string;
  reportId: string;
  recipient: string;
  recipientEmail?: string;
  method: DistributionMethod;
  distributedAt: Date;
  accessedAt?: Date;
  downloadedAt?: Date;
  expiresAt?: Date;
  watermarked: boolean;
  trackingId: string;
  accessCount: number;
  ipAddresses: string[];
  userAgent?: string;
}

export interface DistributionList {
  id: string;
  name: string;
  description?: string;
  recipients: Array<{
    userId: string;
    email: string;
    name: string;
    clearanceLevel: string;
  }>;
  autoDistribute: boolean;
  conditions?: {
    minClassification?: string;
    maxClassification?: string;
    tags?: string[];
  };
}

export class DistributionManager {
  private records: Map<string, DistributionRecord> = new Map();
  private lists: Map<string, DistributionList> = new Map();

  /**
   * Distribute report to recipient
   */
  distribute(
    reportId: string,
    recipient: string,
    method: DistributionMethod,
    options: {
      watermark?: boolean;
      expiresIn?: number; // days
      recipientEmail?: string;
    } = {}
  ): DistributionRecord {
    const record: DistributionRecord = {
      id: uuidv4(),
      reportId,
      recipient,
      recipientEmail: options.recipientEmail,
      method,
      distributedAt: new Date(),
      expiresAt: options.expiresIn
        ? new Date(Date.now() + options.expiresIn * 24 * 60 * 60 * 1000)
        : undefined,
      watermarked: options.watermark || false,
      trackingId: uuidv4(),
      accessCount: 0,
      ipAddresses: []
    };

    this.records.set(record.id, record);
    return record;
  }

  /**
   * Track access to distributed report
   */
  trackAccess(
    trackingId: string,
    ipAddress: string,
    userAgent?: string
  ): void {
    const record = Array.from(this.records.values()).find(
      r => r.trackingId === trackingId
    );

    if (!record) {
      throw new Error(`Distribution record not found for tracking ID: ${trackingId}`);
    }

    if (!record.accessedAt) {
      record.accessedAt = new Date();
    }

    record.accessCount++;
    record.ipAddresses.push(ipAddress);
    record.userAgent = userAgent;
  }

  /**
   * Track download
   */
  trackDownload(trackingId: string): void {
    const record = Array.from(this.records.values()).find(
      r => r.trackingId === trackingId
    );

    if (!record) {
      throw new Error(`Distribution record not found for tracking ID: ${trackingId}`);
    }

    record.downloadedAt = new Date();
  }

  /**
   * Check if access is expired
   */
  isExpired(trackingId: string): boolean {
    const record = Array.from(this.records.values()).find(
      r => r.trackingId === trackingId
    );

    if (!record || !record.expiresAt) return false;

    return new Date() > record.expiresAt;
  }

  /**
   * Create distribution list
   */
  createDistributionList(list: Omit<DistributionList, 'id'>): DistributionList {
    const newList: DistributionList = {
      ...list,
      id: uuidv4()
    };

    this.lists.set(newList.id, newList);
    return newList;
  }

  /**
   * Get distribution records for report
   */
  getDistributionRecords(reportId: string): DistributionRecord[] {
    return Array.from(this.records.values()).filter(
      r => r.reportId === reportId
    );
  }

  /**
   * Get distribution statistics
   */
  getDistributionStats(reportId: string): {
    totalDistributed: number;
    totalAccessed: number;
    totalDownloaded: number;
    uniqueRecipients: number;
    averageAccessCount: number;
  } {
    const records = this.getDistributionRecords(reportId);

    const accessed = records.filter(r => r.accessedAt).length;
    const downloaded = records.filter(r => r.downloadedAt).length;
    const uniqueRecipients = new Set(records.map(r => r.recipient)).size;
    const totalAccessCount = records.reduce((sum, r) => sum + r.accessCount, 0);

    return {
      totalDistributed: records.length,
      totalAccessed: accessed,
      totalDownloaded: downloaded,
      uniqueRecipients,
      averageAccessCount: records.length > 0 ? totalAccessCount / records.length : 0
    };
  }
}
