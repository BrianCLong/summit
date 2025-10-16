/**
 * AML Sanctions Screening Engine
 * Sprint 28C: Real-time screening against global sanctions lists with ML-enhanced matching
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface SanctionsListSource {
  id: string;
  name: string;
  authority: string;
  jurisdiction: string;
  type: 'sanctions' | 'pep' | 'watchlist' | 'adverse_media' | 'enforcements';
  url?: string;
  updateFrequency: 'real_time' | 'daily' | 'weekly' | 'monthly';
  lastUpdated: Date;
  recordCount: number;
  checksum: string;
  metadata: {
    reliability: number;
    coverage: string[];
    language: string;
    format: 'xml' | 'json' | 'csv' | 'pdf';
  };
}

export interface SanctionsRecord {
  id: string;
  sourceId: string;
  externalId: string;
  type: 'individual' | 'entity' | 'vessel' | 'aircraft' | 'other';
  listType: 'sdn' | 'consolidated' | 'sectoral' | 'pep' | 'custom';
  status: 'active' | 'delisted' | 'updated' | 'pending';
  designation: {
    programs: string[];
    reasons: string[];
    effectiveDate: Date;
    expiryDate?: Date;
  };
  subjects: Array<{
    type: 'primary' | 'alias' | 'aka' | 'fka' | 'weak_alias';
    names: Array<{
      fullName: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      title?: string;
      suffix?: string;
      script?: string;
      quality: 'strong' | 'weak';
    }>;
    identifiers: Array<{
      type:
        | 'passport'
        | 'national_id'
        | 'tax_id'
        | 'driver_license'
        | 'birth_cert'
        | 'other';
      value: string;
      country?: string;
      issuedDate?: Date;
      expiryDate?: Date;
    }>;
    dates: Array<{
      type: 'birth' | 'death' | 'incorporation';
      date?: Date;
      circa?: boolean;
      range?: { from: Date; to: Date };
    }>;
    places: Array<{
      type:
        | 'birth'
        | 'residence'
        | 'business'
        | 'registration'
        | 'citizenship'
        | 'nationality';
      location: string;
      country?: string;
      coordinates?: { lat: number; lng: number };
    }>;
    attributes: Array<{
      type:
        | 'gender'
        | 'occupation'
        | 'position'
        | 'nationality'
        | 'vessel_type'
        | 'tonnage';
      value: string;
    }>;
  }>;
  relationships: Array<{
    entityId?: string;
    nature: 'associate' | 'family' | 'business' | 'ownership' | 'control';
    description: string;
  }>;
  metadata: {
    confidence: number;
    lastVerified: Date;
    sources: string[];
    remarks?: string;
  };
}

export interface ScreeningRequest {
  id: string;
  requestor: string;
  target: {
    type: 'individual' | 'entity' | 'transaction' | 'batch';
    data: any;
  };
  configuration: {
    lists: string[];
    threshold: number;
    fuzzyMatching: boolean;
    phoneticMatching: boolean;
    synonymMatching: boolean;
    includeHistorical: boolean;
    jurisdiction?: string[];
  };
  status: 'pending' | 'screening' | 'completed' | 'failed';
  timing: {
    requestTime: Date;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
  };
  results?: ScreeningResult;
}

export interface ScreeningResult {
  requestId: string;
  overallRisk: 'clear' | 'potential' | 'match' | 'blocked';
  confidence: number;
  matches: Array<{
    recordId: string;
    confidence: number;
    matchType: 'exact' | 'fuzzy' | 'phonetic' | 'synonym' | 'partial';
    matchedFields: Array<{
      field: string;
      targetValue: string;
      sanctionValue: string;
      similarity: number;
    }>;
    record: SanctionsRecord;
    riskScore: number;
    recommendation: 'clear' | 'review' | 'escalate' | 'block';
  }>;
  falsePositives: Array<{
    recordId: string;
    reason: string;
    confidence: number;
  }>;
  analytics: {
    recordsScreened: number;
    listsChecked: string[];
    processedInMs: number;
    cacheHitRate: number;
  };
  audit: {
    screenedAt: Date;
    screenedBy: string;
    jurisdiction: string;
    compliance: string[];
  };
}

export interface ScreeningAlert {
  id: string;
  requestId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type:
    | 'sanctions_match'
    | 'pep_match'
    | 'adverse_media'
    | 'watchlist_hit'
    | 'high_risk_jurisdiction';
  subject: {
    name: string;
    type: string;
    identifiers: string[];
  };
  matches: string[];
  recommendation: 'investigate' | 'escalate' | 'block' | 'file_sar';
  assignedTo?: string;
  status: 'open' | 'investigating' | 'false_positive' | 'escalated' | 'closed';
  investigation: {
    notes: Array<{
      timestamp: Date;
      author: string;
      content: string;
      attachments?: string[];
    }>;
    decisions: Array<{
      timestamp: Date;
      decision: string;
      rationale: string;
      approver: string;
    }>;
  };
  timing: {
    createdAt: Date;
    updatedAt: Date;
    dueDate?: Date;
    closedAt?: Date;
  };
}

export interface RealTimeUpdate {
  sourceId: string;
  updateType: 'addition' | 'modification' | 'delisting' | 'bulk_refresh';
  records: Array<{
    action: 'add' | 'update' | 'delete';
    recordId: string;
    data?: SanctionsRecord;
  }>;
  effectiveDate: Date;
  checksum: string;
  signature?: string;
}

export class SanctionsScreener extends EventEmitter {
  private sources = new Map<string, SanctionsListSource>();
  private records = new Map<string, SanctionsRecord>();
  private requests = new Map<string, ScreeningRequest>();
  private alerts = new Map<string, ScreeningAlert>();

  // Advanced matching components
  private nameVariations = new Map<string, string[]>();
  private phoneticIndex = new Map<string, Set<string>>();
  private synonymIndex = new Map<string, Set<string>>();

  // ML models for enhanced matching
  private nameEmbeddings = new Map<string, number[]>();
  private riskClassifier: any; // ML model for risk classification

  constructor() {
    super();
    this.initializeDefaultSources();
    this.initializeMatchingIndices();
  }

  /**
   * Register sanctions list source
   */
  async registerSource(
    source: Omit<SanctionsListSource, 'id'>,
  ): Promise<SanctionsListSource> {
    const fullSource: SanctionsListSource = {
      ...source,
      id: crypto.randomUUID(),
    };

    this.sources.set(fullSource.id, fullSource);
    this.emit('source_registered', fullSource);

    // Trigger initial data load
    if (fullSource.url) {
      await this.loadSourceData(fullSource.id);
    }

    return fullSource;
  }

  /**
   * Load and index sanctions data from source
   */
  async loadSourceData(sourceId: string): Promise<{
    loaded: number;
    updated: number;
    errors: number;
    processingTime: number;
  }> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    const startTime = Date.now();
    let loaded = 0,
      updated = 0,
      errors = 0;

    try {
      // Mock data loading - in practice, fetch from actual sources
      const mockData = await this.fetchSourceData(source);

      for (const recordData of mockData) {
        try {
          const record = await this.parseAndValidateRecord(
            recordData,
            sourceId,
          );
          const existing = this.records.get(record.id);

          if (existing) {
            if (this.isRecordNewer(record, existing)) {
              this.records.set(record.id, record);
              await this.updateMatchingIndices(record);
              updated++;
            }
          } else {
            this.records.set(record.id, record);
            await this.updateMatchingIndices(record);
            loaded++;
          }
        } catch (error) {
          errors++;
        }
      }

      // Update source metadata
      source.lastUpdated = new Date();
      source.recordCount = mockData.length;
      source.checksum = this.calculateChecksum(mockData);
      this.sources.set(sourceId, source);

      const processingTime = Date.now() - startTime;

      this.emit('source_loaded', {
        sourceId,
        loaded,
        updated,
        errors,
        processingTime,
      });

      return { loaded, updated, errors, processingTime };
    } catch (error) {
      this.emit('source_load_failed', { sourceId, error: error.message });
      throw error;
    }
  }

  /**
   * Screen entity against sanctions lists
   */
  async screenEntity(
    target: {
      names: string[];
      identifiers?: Array<{ type: string; value: string }>;
      dates?: Array<{ type: string; date: Date }>;
      places?: Array<{ type: string; location: string }>;
    },
    configuration: ScreeningRequest['configuration'],
    requestor: string,
  ): Promise<ScreeningRequest> {
    const request: ScreeningRequest = {
      id: crypto.randomUUID(),
      requestor,
      target: {
        type: 'individual',
        data: target,
      },
      configuration: {
        threshold: 0.8,
        fuzzyMatching: true,
        phoneticMatching: true,
        synonymMatching: true,
        includeHistorical: false,
        ...configuration,
      },
      status: 'pending',
      timing: {
        requestTime: new Date(),
      },
    };

    this.requests.set(request.id, request);

    // Execute screening asynchronously
    this.executeScreening(request).catch((error) => {
      request.status = 'failed';
      request.timing.endTime = new Date();
      this.requests.set(request.id, request);
      this.emit('screening_failed', {
        requestId: request.id,
        error: error.message,
      });
    });

    return request;
  }

  /**
   * Batch screening for multiple entities
   */
  async screenBatch(
    entities: Array<{
      id: string;
      names: string[];
      identifiers?: Array<{ type: string; value: string }>;
    }>,
    configuration: ScreeningRequest['configuration'],
    requestor: string,
  ): Promise<ScreeningRequest> {
    const request: ScreeningRequest = {
      id: crypto.randomUUID(),
      requestor,
      target: {
        type: 'batch',
        data: entities,
      },
      configuration,
      status: 'pending',
      timing: {
        requestTime: new Date(),
      },
    };

    this.requests.set(request.id, request);

    // Execute batch screening
    this.executeBatchScreening(request).catch((error) => {
      request.status = 'failed';
      this.requests.set(request.id, request);
    });

    return request;
  }

  /**
   * Create screening alert
   */
  async createAlert(
    requestId: string,
    matches: ScreeningResult['matches'],
    severity: ScreeningAlert['severity'],
  ): Promise<ScreeningAlert> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Screening request not found');
    }

    const alert: ScreeningAlert = {
      id: crypto.randomUUID(),
      requestId,
      severity,
      type: this.determineAlertType(matches),
      subject: {
        name: request.target.data.names?.[0] || 'Unknown',
        type: request.target.type,
        identifiers:
          request.target.data.identifiers?.map((id: any) => id.value) || [],
      },
      matches: matches.map((m) => m.recordId),
      recommendation: this.determineRecommendation(matches, severity),
      status: 'open',
      investigation: {
        notes: [],
        decisions: [],
      },
      timing: {
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: this.calculateDueDate(severity),
      },
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert_created', alert);

    return alert;
  }

  /**
   * Update alert with investigation notes
   */
  async updateAlert(
    alertId: string,
    update: {
      status?: ScreeningAlert['status'];
      assignedTo?: string;
      notes?: Array<{
        author: string;
        content: string;
        attachments?: string[];
      }>;
      decision?: {
        decision: string;
        rationale: string;
        approver: string;
      };
    },
  ): Promise<ScreeningAlert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (update.status) {
      alert.status = update.status;
      if (update.status === 'closed') {
        alert.timing.closedAt = new Date();
      }
    }

    if (update.assignedTo) {
      alert.assignedTo = update.assignedTo;
    }

    if (update.notes) {
      update.notes.forEach((note) => {
        alert.investigation.notes.push({
          timestamp: new Date(),
          ...note,
        });
      });
    }

    if (update.decision) {
      alert.investigation.decisions.push({
        timestamp: new Date(),
        ...update.decision,
      });
    }

    alert.timing.updatedAt = new Date();
    this.alerts.set(alertId, alert);

    this.emit('alert_updated', alert);
    return alert;
  }

  /**
   * Process real-time sanctions list updates
   */
  async processRealTimeUpdate(update: RealTimeUpdate): Promise<{
    processed: number;
    errors: number;
    impactedScreenings: string[];
  }> {
    const source = this.sources.get(update.sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    let processed = 0;
    let errors = 0;
    const impactedScreenings: string[] = [];

    for (const recordUpdate of update.records) {
      try {
        switch (recordUpdate.action) {
          case 'add':
          case 'update':
            if (recordUpdate.data) {
              this.records.set(recordUpdate.recordId, recordUpdate.data);
              await this.updateMatchingIndices(recordUpdate.data);
              processed++;
            }
            break;

          case 'delete':
            this.records.delete(recordUpdate.recordId);
            await this.removeFromIndices(recordUpdate.recordId);
            processed++;
            break;
        }

        // Check if this update affects any recent screenings
        const affected = await this.findAffectedScreenings(
          recordUpdate.recordId,
        );
        impactedScreenings.push(...affected);
      } catch (error) {
        errors++;
      }
    }

    // Update source metadata
    source.lastUpdated = update.effectiveDate;
    source.checksum = update.checksum;
    this.sources.set(update.sourceId, source);

    this.emit('realtime_update_processed', {
      sourceId: update.sourceId,
      processed,
      errors,
      impactedScreenings: [...new Set(impactedScreenings)],
    });

    return {
      processed,
      errors,
      impactedScreenings: [...new Set(impactedScreenings)],
    };
  }

  /**
   * Get screening statistics
   */
  getStatistics(): {
    sources: number;
    records: number;
    requests24h: number;
    avgResponseTime: number;
    matchRate: number;
    falsePositiveRate: number;
    alertsOpen: number;
  } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recent = Array.from(this.requests.values()).filter(
      (r) => r.timing.requestTime >= yesterday,
    );

    const completed = recent.filter((r) => r.status === 'completed');
    const avgResponseTime =
      completed.length > 0
        ? completed.reduce((sum, r) => sum + (r.timing.duration || 0), 0) /
          completed.length
        : 0;

    const withMatches = completed.filter(
      (r) => r.results && r.results.matches.length > 0,
    );
    const matchRate =
      completed.length > 0 ? withMatches.length / completed.length : 0;

    const falsePositives = completed.reduce(
      (sum, r) => sum + (r.results?.falsePositives.length || 0),
      0,
    );
    const totalMatches = completed.reduce(
      (sum, r) => sum + (r.results?.matches.length || 0),
      0,
    );
    const falsePositiveRate =
      totalMatches > 0 ? falsePositives / totalMatches : 0;

    const openAlerts = Array.from(this.alerts.values()).filter(
      (a) => a.status === 'open' || a.status === 'investigating',
    ).length;

    return {
      sources: this.sources.size,
      records: this.records.size,
      requests24h: recent.length,
      avgResponseTime,
      matchRate,
      falsePositiveRate,
      alertsOpen: openAlerts,
    };
  }

  private async executeScreening(request: ScreeningRequest): Promise<void> {
    request.status = 'screening';
    request.timing.startTime = new Date();

    try {
      const target = request.target.data;
      const matches: ScreeningResult['matches'] = [];
      let recordsScreened = 0;

      // Get relevant records to screen
      const candidateRecords = await this.getCandidateRecords(
        target,
        request.configuration,
      );

      for (const record of candidateRecords) {
        recordsScreened++;

        const match = await this.evaluateMatch(
          target,
          record,
          request.configuration,
        );

        if (match && match.confidence >= request.configuration.threshold) {
          matches.push(match);
        }
      }

      // Calculate overall risk
      const overallRisk = this.calculateOverallRisk(matches);
      const confidence =
        matches.length > 0
          ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
          : 0;

      request.timing.endTime = new Date();
      request.timing.duration =
        request.timing.endTime.getTime() - request.timing.startTime!.getTime();

      request.results = {
        requestId: request.id,
        overallRisk,
        confidence,
        matches: matches.sort((a, b) => b.confidence - a.confidence),
        falsePositives: [],
        analytics: {
          recordsScreened,
          listsChecked: request.configuration.lists,
          processedInMs: request.timing.duration,
          cacheHitRate: 0.85, // Mock cache hit rate
        },
        audit: {
          screenedAt: request.timing.endTime,
          screenedBy: request.requestor,
          jurisdiction: 'US',
          compliance: ['OFAC', 'BSA', 'PATRIOT_ACT'],
        },
      };

      request.status = 'completed';
      this.requests.set(request.id, request);

      // Create alert if matches found
      if (matches.length > 0) {
        const severity = this.determineSeverity(matches);
        await this.createAlert(request.id, matches, severity);
      }

      this.emit('screening_completed', request);
    } catch (error) {
      request.status = 'failed';
      request.timing.endTime = new Date();
      this.requests.set(request.id, request);
      throw error;
    }
  }

  private async executeBatchScreening(
    request: ScreeningRequest,
  ): Promise<void> {
    request.status = 'screening';
    request.timing.startTime = new Date();

    try {
      const entities = request.target.data;
      const batchResults: Array<{
        entityId: string;
        matches: ScreeningResult['matches'];
      }> = [];

      for (const entity of entities) {
        const matches: ScreeningResult['matches'] = [];
        const candidateRecords = await this.getCandidateRecords(
          entity,
          request.configuration,
        );

        for (const record of candidateRecords) {
          const match = await this.evaluateMatch(
            entity,
            record,
            request.configuration,
          );
          if (match && match.confidence >= request.configuration.threshold) {
            matches.push(match);
          }
        }

        batchResults.push({ entityId: entity.id, matches });
      }

      request.timing.endTime = new Date();
      request.timing.duration =
        request.timing.endTime.getTime() - request.timing.startTime!.getTime();

      request.status = 'completed';
      this.requests.set(request.id, request);

      this.emit('batch_screening_completed', {
        request,
        results: batchResults,
      });
    } catch (error) {
      request.status = 'failed';
      throw error;
    }
  }

  private async getCandidateRecords(
    target: any,
    config: ScreeningRequest['configuration'],
  ): Promise<SanctionsRecord[]> {
    const candidates = new Set<SanctionsRecord>();

    // Filter by configured lists
    const relevantRecords = Array.from(this.records.values()).filter(
      (record) =>
        config.lists.length === 0 || config.lists.includes(record.sourceId),
    );

    // Use indices for efficient candidate selection
    for (const name of target.names || []) {
      // Exact matches
      const exactMatches = this.findExactMatches(name);
      exactMatches.forEach((record) => candidates.add(record));

      // Phonetic matches
      if (config.phoneticMatching) {
        const phoneticMatches = this.findPhoneticMatches(name);
        phoneticMatches.forEach((record) => candidates.add(record));
      }

      // Fuzzy matches (limited to prevent performance issues)
      if (config.fuzzyMatching) {
        const fuzzyMatches = this.findFuzzyMatches(name, 0.7);
        fuzzyMatches.slice(0, 100).forEach((record) => candidates.add(record)); // Limit fuzzy matches
      }
    }

    return Array.from(candidates);
  }

  private async evaluateMatch(
    target: any,
    record: SanctionsRecord,
    config: ScreeningRequest['configuration'],
  ): Promise<ScreeningResult['matches'][0] | null> {
    const matchedFields: ScreeningResult['matches'][0]['matchedFields'] = [];
    let totalScore = 0;
    let matchCount = 0;

    // Compare names
    for (const targetName of target.names || []) {
      for (const subject of record.subjects) {
        for (const sanctionName of subject.names) {
          const similarity = this.calculateNameSimilarity(
            targetName,
            sanctionName.fullName,
            config,
          );
          if (similarity > 0.6) {
            matchedFields.push({
              field: 'name',
              targetValue: targetName,
              sanctionValue: sanctionName.fullName,
              similarity,
            });
            totalScore += similarity;
            matchCount++;
          }
        }
      }
    }

    // Compare identifiers
    for (const targetId of target.identifiers || []) {
      for (const subject of record.subjects) {
        for (const sanctionId of subject.identifiers) {
          if (
            targetId.type === sanctionId.type &&
            targetId.value === sanctionId.value
          ) {
            matchedFields.push({
              field: 'identifier',
              targetValue: targetId.value,
              sanctionValue: sanctionId.value,
              similarity: 1.0,
            });
            totalScore += 1.0;
            matchCount++;
          }
        }
      }
    }

    if (matchCount === 0) return null;

    const confidence = totalScore / matchCount;
    const riskScore = this.calculateRiskScore(record, confidence);

    return {
      recordId: record.id,
      confidence,
      matchType: this.determineMatchType(matchedFields),
      matchedFields,
      record,
      riskScore,
      recommendation: this.getMatchRecommendation(confidence, riskScore),
    };
  }

  private calculateNameSimilarity(
    name1: string,
    name2: string,
    config: ScreeningRequest['configuration'],
  ): number {
    // Exact match
    if (name1.toLowerCase() === name2.toLowerCase()) return 1.0;

    let maxSimilarity = 0;

    // Fuzzy matching
    if (config.fuzzyMatching) {
      maxSimilarity = Math.max(
        maxSimilarity,
        this.fuzzyStringMatch(name1, name2),
      );
    }

    // Phonetic matching
    if (config.phoneticMatching) {
      maxSimilarity = Math.max(maxSimilarity, this.phoneticMatch(name1, name2));
    }

    // Synonym matching
    if (config.synonymMatching) {
      maxSimilarity = Math.max(maxSimilarity, this.synonymMatch(name1, name2));
    }

    return maxSimilarity;
  }

  private fuzzyStringMatch(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;

    const distance = this.levenshteinDistance(
      str1.toLowerCase(),
      str2.toLowerCase(),
    );
    return 1.0 - distance / maxLen;
  }

  private phoneticMatch(str1: string, str2: string): number {
    const soundex1 = this.soundex(str1);
    const soundex2 = this.soundex(str2);
    return soundex1 === soundex2 ? 0.85 : 0.0;
  }

  private synonymMatch(str1: string, str2: string): number {
    const synonyms1 = this.synonymIndex.get(str1.toLowerCase()) || new Set();
    const synonyms2 = this.synonymIndex.get(str2.toLowerCase()) || new Set();

    if (
      synonyms1.has(str2.toLowerCase()) ||
      synonyms2.has(str1.toLowerCase())
    ) {
      return 0.9;
    }

    return 0.0;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private soundex(str: string): string {
    const a = str.toLowerCase().split('');
    const f = a.shift() || '';
    const r = a
      .join('')
      .replace(/[aeiouyhw]/g, '')
      .replace(/[bfpv]/g, '1')
      .replace(/[cgjkqsxz]/g, '2')
      .replace(/[dt]/g, '3')
      .replace(/[l]/g, '4')
      .replace(/[mn]/g, '5')
      .replace(/[r]/g, '6')
      .replace(/(.)\1+/g, '$1');

    return (f + r + '000').slice(0, 4).toUpperCase();
  }

  private findExactMatches(name: string): SanctionsRecord[] {
    const matches: SanctionsRecord[] = [];

    for (const record of this.records.values()) {
      for (const subject of record.subjects) {
        for (const sanctionName of subject.names) {
          if (sanctionName.fullName.toLowerCase() === name.toLowerCase()) {
            matches.push(record);
            break;
          }
        }
      }
    }

    return matches;
  }

  private findPhoneticMatches(name: string): SanctionsRecord[] {
    const soundexCode = this.soundex(name);
    const recordIds = this.phoneticIndex.get(soundexCode) || new Set();
    return Array.from(recordIds)
      .map((id) => this.records.get(id)!)
      .filter(Boolean);
  }

  private findFuzzyMatches(name: string, threshold: number): SanctionsRecord[] {
    const matches: Array<{ record: SanctionsRecord; similarity: number }> = [];

    for (const record of this.records.values()) {
      for (const subject of record.subjects) {
        for (const sanctionName of subject.names) {
          const similarity = this.fuzzyStringMatch(name, sanctionName.fullName);
          if (similarity >= threshold) {
            matches.push({ record, similarity });
          }
        }
      }
    }

    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .map((m) => m.record);
  }

  private calculateRiskScore(
    record: SanctionsRecord,
    confidence: number,
  ): number {
    let riskScore = confidence;

    // Adjust based on list type
    switch (record.listType) {
      case 'sdn':
        riskScore *= 1.0; // Highest risk
        break;
      case 'consolidated':
        riskScore *= 0.9;
        break;
      case 'pep':
        riskScore *= 0.7;
        break;
      default:
        riskScore *= 0.8;
    }

    // Adjust based on designation programs
    if (record.designation.programs.includes('TERRORISM')) {
      riskScore *= 1.2;
    }

    return Math.min(riskScore, 1.0);
  }

  private calculateOverallRisk(
    matches: ScreeningResult['matches'],
  ): ScreeningResult['overallRisk'] {
    if (matches.length === 0) return 'clear';

    const maxRisk = Math.max(...matches.map((m) => m.riskScore));

    if (maxRisk >= 0.95) return 'blocked';
    if (maxRisk >= 0.8) return 'match';
    if (maxRisk >= 0.6) return 'potential';
    return 'clear';
  }

  private determineMatchType(
    matchedFields: ScreeningResult['matches'][0]['matchedFields'],
  ): ScreeningResult['matches'][0]['matchType'] {
    const exactFields = matchedFields.filter((f) => f.similarity === 1.0);
    if (exactFields.length > 0) return 'exact';

    const highFields = matchedFields.filter((f) => f.similarity >= 0.9);
    if (highFields.length > 0) return 'fuzzy';

    return 'partial';
  }

  private getMatchRecommendation(
    confidence: number,
    riskScore: number,
  ): ScreeningResult['matches'][0]['recommendation'] {
    if (riskScore >= 0.95) return 'block';
    if (riskScore >= 0.8) return 'escalate';
    if (riskScore >= 0.6) return 'review';
    return 'clear';
  }

  private determineAlertType(
    matches: ScreeningResult['matches'],
  ): ScreeningAlert['type'] {
    const listTypes = matches.map((m) => m.record.listType);

    if (listTypes.includes('sdn')) return 'sanctions_match';
    if (listTypes.includes('pep')) return 'pep_match';
    return 'watchlist_hit';
  }

  private determineSeverity(
    matches: ScreeningResult['matches'],
  ): ScreeningAlert['severity'] {
    const maxRisk = Math.max(...matches.map((m) => m.riskScore));

    if (maxRisk >= 0.95) return 'critical';
    if (maxRisk >= 0.8) return 'high';
    if (maxRisk >= 0.6) return 'medium';
    return 'low';
  }

  private determineRecommendation(
    matches: ScreeningResult['matches'],
    severity: ScreeningAlert['severity'],
  ): ScreeningAlert['recommendation'] {
    if (severity === 'critical') return 'block';
    if (severity === 'high') return 'escalate';
    if (severity === 'medium') return 'investigate';
    return 'investigate';
  }

  private calculateDueDate(severity: ScreeningAlert['severity']): Date {
    const now = new Date();
    const hours = severity === 'critical' ? 4 : severity === 'high' ? 24 : 72;
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  private async fetchSourceData(source: SanctionsListSource): Promise<any[]> {
    // Mock data fetch - in practice, call actual APIs
    return [
      {
        id: `mock_record_${crypto.randomUUID()}`,
        fullName: 'John Doe',
        listType: 'sdn',
        programs: ['TERRORISM'],
      },
    ];
  }

  private async parseAndValidateRecord(
    data: any,
    sourceId: string,
  ): Promise<SanctionsRecord> {
    return {
      id: data.id,
      sourceId,
      externalId: data.id,
      type: 'individual',
      listType: data.listType,
      status: 'active',
      designation: {
        programs: data.programs || [],
        reasons: [],
        effectiveDate: new Date(),
      },
      subjects: [
        {
          type: 'primary',
          names: [
            {
              fullName: data.fullName,
              quality: 'strong',
            },
          ],
          identifiers: [],
          dates: [],
          places: [],
          attributes: [],
        },
      ],
      relationships: [],
      metadata: {
        confidence: 1.0,
        lastVerified: new Date(),
        sources: [sourceId],
      },
    };
  }

  private isRecordNewer(
    record1: SanctionsRecord,
    record2: SanctionsRecord,
  ): boolean {
    return record1.metadata.lastVerified > record2.metadata.lastVerified;
  }

  private calculateChecksum(data: any[]): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private async updateMatchingIndices(record: SanctionsRecord): Promise<void> {
    // Update phonetic index
    for (const subject of record.subjects) {
      for (const name of subject.names) {
        const soundexCode = this.soundex(name.fullName);
        if (!this.phoneticIndex.has(soundexCode)) {
          this.phoneticIndex.set(soundexCode, new Set());
        }
        this.phoneticIndex.get(soundexCode)!.add(record.id);
      }
    }
  }

  private async removeFromIndices(recordId: string): Promise<void> {
    // Remove from phonetic index
    for (const recordIds of this.phoneticIndex.values()) {
      recordIds.delete(recordId);
    }
  }

  private async findAffectedScreenings(recordId: string): Promise<string[]> {
    // Find recent screenings that might be affected by this record update
    const recent = Array.from(this.requests.values()).filter(
      (r) => r.timing.requestTime > new Date(Date.now() - 24 * 60 * 60 * 1000),
    );

    return recent.map((r) => r.id);
  }

  private initializeDefaultSources(): void {
    // OFAC SDN List
    this.registerSource({
      name: 'OFAC Specially Designated Nationals (SDN)',
      authority: 'U.S. Treasury Department',
      jurisdiction: 'US',
      type: 'sanctions',
      url: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
      updateFrequency: 'daily',
      lastUpdated: new Date(),
      recordCount: 0,
      checksum: '',
      metadata: {
        reliability: 1.0,
        coverage: ['global'],
        language: 'en',
        format: 'xml',
      },
    });

    // UN Consolidated List
    this.registerSource({
      name: 'UN Consolidated List',
      authority: 'United Nations',
      jurisdiction: 'UN',
      type: 'sanctions',
      updateFrequency: 'daily',
      lastUpdated: new Date(),
      recordCount: 0,
      checksum: '',
      metadata: {
        reliability: 0.95,
        coverage: ['global'],
        language: 'en',
        format: 'xml',
      },
    });
  }

  private initializeMatchingIndices(): void {
    // Initialize common name variations
    this.nameVariations.set('john', ['jon', 'johnny', 'johnnie']);
    this.nameVariations.set('william', ['bill', 'billy', 'will', 'willie']);
    this.nameVariations.set('robert', ['bob', 'bobby', 'rob', 'robbie']);

    // Initialize synonym index
    this.synonymIndex.set(
      'corporation',
      new Set(['corp', 'inc', 'ltd', 'llc']),
    );
    this.synonymIndex.set('company', new Set(['co', 'corp', 'inc']));
    this.synonymIndex.set('limited', new Set(['ltd', 'ltda']));
  }
}
