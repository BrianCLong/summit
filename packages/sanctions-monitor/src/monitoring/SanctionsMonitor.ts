/**
 * Sanctions Monitor - Core Monitoring Engine
 * Real-time monitoring and tracking of international sanctions
 */

import { EventEmitter } from 'events';
import {
  SanctionDesignation,
  SanctionUpdate,
  SanctionFilter,
  MonitoringConfig,
  SanctionRegime,
  SanctionType,
  EntityType,
  ComplianceRiskLevel,
  ComplianceCheck,
  SanctionMatch,
  Alert,
  ComplianceMetrics,
  EntityIdentifier
} from '../types/index.js';

export class SanctionsMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private designations: Map<string, SanctionDesignation>;
  private activeMonitors: Set<string>;
  private monitoringInterval?: NodeJS.Timeout;
  private screeningQueue: ComplianceCheck[];
  private metrics: ComplianceMetrics;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.designations = new Map();
    this.activeMonitors = new Set();
    this.screeningQueue = [];
    this.metrics = this.initializeMetrics();
  }

  /**
   * Start monitoring sanctions
   */
  async start(): Promise<void> {
    console.log('Starting Sanctions Monitor...');

    // Initialize monitoring for configured regimes
    for (const regime of this.config.regimes) {
      await this.startRegimeMonitor(regime);
    }

    // Start update monitoring if enabled
    if (this.config.monitorUpdates && this.config.updateInterval > 0) {
      this.monitoringInterval = setInterval(() => {
        this.checkForUpdates();
      }, this.config.updateInterval);
    }

    // Start auto-screening if enabled
    if (this.config.enableAutoScreening && this.config.screeningFrequency > 0) {
      setInterval(() => {
        this.processScreeningQueue();
      }, this.config.screeningFrequency);
    }

    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    console.log('Stopping Sanctions Monitor...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.activeMonitors.clear();
    this.emit('stopped', { timestamp: new Date() });
  }

  /**
   * Track a new sanction designation
   */
  async trackDesignation(designation: SanctionDesignation): Promise<void> {
    // Validate designation meets criteria
    if (!this.meetsMonitoringCriteria(designation)) {
      return;
    }

    const existing = this.designations.get(designation.id);
    const isUpdate = !!existing;

    this.designations.set(designation.id, designation);
    this.metrics.designationsTracked = this.designations.size;

    if (isUpdate) {
      this.emit('designation-updated', designation);
      this.metrics.updatesProcessed++;
    } else {
      this.emit('designation-added', designation);
    }

    // Generate alert if configured
    if (this.shouldAlert(designation)) {
      await this.generateDesignationAlert(designation, isUpdate);
    }

    this.metrics.lastUpdateTime = new Date();
  }

  /**
   * Process a sanction update
   */
  async processUpdate(update: SanctionUpdate): Promise<void> {
    const designation = this.designations.get(update.designationId);

    if (!designation) {
      console.warn(`Designation not found: ${update.designationId}`);
      return;
    }

    // Apply changes
    let updatedDesignation = { ...designation };

    for (const change of update.changes) {
      if (change.field in updatedDesignation) {
        (updatedDesignation as any)[change.field] = change.newValue;
      }
    }

    updatedDesignation.lastUpdated = update.timestamp;
    updatedDesignation.updated = true;

    // Handle delisting
    if (update.updateType === 'DELISTING') {
      updatedDesignation.active = false;
    }

    await this.trackDesignation(updatedDesignation);

    this.emit('sanction-update', update);
    this.metrics.updatesProcessed++;
  }

  /**
   * Screen an entity against sanctions lists
   */
  async screenEntity(
    entityName: string,
    entityIdentifiers: EntityIdentifier[] = [],
    checkType: ComplianceCheck['checkType'] = 'NAME_SCREENING'
  ): Promise<ComplianceCheck> {
    const check: ComplianceCheck = {
      id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityName,
      entityIdentifiers,
      checkType,
      timestamp: new Date(),
      matches: [],
      overallRisk: ComplianceRiskLevel.LOW,
      regimesChecked: this.config.regimes,
      listsChecked: this.getActiveListNames(),
      requiresReview: false,
      blockedTransaction: false,
      escalated: false,
      metadata: {}
    };

    // Perform screening
    const matches = await this.performScreening(entityName, entityIdentifiers);
    check.matches = matches;

    // Determine overall risk
    check.overallRisk = this.calculateOverallRisk(matches);
    check.requiresReview = this.requiresReview(check.overallRisk);

    // Auto-block if configured
    if (
      this.config.autoBlockTransactions &&
      (check.overallRisk === ComplianceRiskLevel.CRITICAL ||
        check.overallRisk === ComplianceRiskLevel.PROHIBITED)
    ) {
      check.blockedTransaction = true;
    }

    // Update metrics
    this.metrics.totalScreenings++;
    if (matches.length > 0) {
      this.metrics.matchRate =
        (this.metrics.matchRate * (this.metrics.totalScreenings - 1) + 1) /
        this.metrics.totalScreenings;
    }

    // Emit events
    this.emit('screening-completed', check);

    if (matches.length > 0) {
      this.emit('match-detected', check);

      // Generate alert for high-risk matches
      if (this.shouldAlertForMatch(check)) {
        await this.generateMatchAlert(check);
      }
    }

    return check;
  }

  /**
   * Get designations with optional filtering
   */
  getDesignations(filter?: SanctionFilter): SanctionDesignation[] {
    let designations = Array.from(this.designations.values());

    if (!filter) {
      return designations;
    }

    // Apply filters
    if (filter.regimes && filter.regimes.length > 0) {
      designations = designations.filter(d =>
        filter.regimes!.includes(d.regime)
      );
    }

    if (filter.sanctionTypes && filter.sanctionTypes.length > 0) {
      designations = designations.filter(d =>
        d.sanctionTypes.some(st => filter.sanctionTypes!.includes(st))
      );
    }

    if (filter.entityTypes && filter.entityTypes.length > 0) {
      designations = designations.filter(d =>
        filter.entityTypes!.includes(d.entityType)
      );
    }

    if (filter.jurisdictions && filter.jurisdictions.length > 0) {
      designations = designations.filter(d =>
        d.nationality?.some(n => filter.jurisdictions!.includes(n)) ||
        d.addresses.some(a => filter.jurisdictions!.includes(a.country))
      );
    }

    if (filter.active !== undefined) {
      designations = designations.filter(d => d.active === filter.active);
    }

    if (filter.dateRange) {
      designations = designations.filter(
        d =>
          d.designationDate >= filter.dateRange!.start &&
          d.designationDate <= filter.dateRange!.end
      );
    }

    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      designations = designations.filter(
        d =>
          d.name.toLowerCase().includes(term) ||
          d.aliases.some(a => a.toLowerCase().includes(term))
      );
    }

    if (filter.country && filter.country.length > 0) {
      designations = designations.filter(
        d =>
          d.nationality?.some(n => filter.country!.includes(n)) ||
          d.addresses.some(a => filter.country!.includes(a.country))
      );
    }

    return designations;
  }

  /**
   * Get designation by ID
   */
  getDesignation(designationId: string): SanctionDesignation | undefined {
    return this.designations.get(designationId);
  }

  /**
   * Search for entity by name or identifier
   */
  async searchEntity(
    query: string,
    searchType: 'NAME' | 'IDENTIFIER' = 'NAME'
  ): Promise<SanctionDesignation[]> {
    const results: SanctionDesignation[] = [];
    const queryLower = query.toLowerCase();

    for (const designation of this.designations.values()) {
      if (!designation.active) continue;

      if (searchType === 'NAME') {
        // Search in name and aliases
        if (designation.name.toLowerCase().includes(queryLower)) {
          results.push(designation);
          continue;
        }

        if (designation.aliases.some(a => a.toLowerCase().includes(queryLower))) {
          results.push(designation);
          continue;
        }
      } else {
        // Search in identifiers
        if (
          designation.identifiers.some(id =>
            id.value.toLowerCase().includes(queryLower)
          )
        ) {
          results.push(designation);
        }
      }
    }

    return results;
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    totalDesignations: number;
    activeDesignations: number;
    designationsByRegime: Record<SanctionRegime, number>;
    designationsByType: Record<SanctionType, number>;
    designationsByEntity: Record<EntityType, number>;
    activeMonitors: number;
    recentUpdates: number;
  } {
    const designations = Array.from(this.designations.values());
    const activeDesignations = designations.filter(d => d.active);

    const designationsByRegime = designations.reduce((acc, d) => {
      acc[d.regime] = (acc[d.regime] || 0) + 1;
      return acc;
    }, {} as Record<SanctionRegime, number>);

    const designationsByType = designations.reduce((acc, d) => {
      d.sanctionTypes.forEach(type => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {} as Record<SanctionType, number>);

    const designationsByEntity = designations.reduce((acc, d) => {
      acc[d.entityType] = (acc[d.entityType] || 0) + 1;
      return acc;
    }, {} as Record<EntityType, number>);

    const recentUpdates = designations.filter(
      d =>
        d.updated &&
        d.lastUpdated.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
    ).length;

    return {
      totalDesignations: designations.length,
      activeDesignations: activeDesignations.length,
      designationsByRegime,
      designationsByType,
      designationsByEntity,
      activeMonitors: this.activeMonitors.size,
      recentUpdates
    };
  }

  /**
   * Get compliance metrics
   */
  getMetrics(): ComplianceMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all designations
   */
  clearDesignations(): void {
    this.designations.clear();
    this.metrics.designationsTracked = 0;
    this.emit('designations-cleared');
  }

  /**
   * Add screening to queue
   */
  queueScreening(check: ComplianceCheck): void {
    this.screeningQueue.push(check);
  }

  /**
   * Start monitoring a specific regime
   */
  private async startRegimeMonitor(regime: SanctionRegime): Promise<void> {
    const monitorId = `regime:${regime}`;
    if (this.activeMonitors.has(monitorId)) {
      return;
    }

    this.activeMonitors.add(monitorId);
    console.log(`Started monitoring regime: ${regime}`);
  }

  /**
   * Check for sanctions updates
   */
  private async checkForUpdates(): Promise<void> {
    // This would integrate with various sanctions data sources
    // For now, emit an update event
    this.emit('update-check', {
      timestamp: new Date(),
      regimes: Array.from(this.activeMonitors),
      designationsTracked: this.designations.size
    });
  }

  /**
   * Process queued screenings
   */
  private async processScreeningQueue(): Promise<void> {
    while (this.screeningQueue.length > 0) {
      const check = this.screeningQueue.shift();
      if (check) {
        await this.screenEntity(
          check.entityName,
          check.entityIdentifiers,
          check.checkType
        );
      }
    }
  }

  /**
   * Perform screening logic
   */
  private async performScreening(
    entityName: string,
    identifiers: EntityIdentifier[]
  ): Promise<SanctionMatch[]> {
    const matches: SanctionMatch[] = [];
    const nameLower = entityName.toLowerCase();

    for (const designation of this.designations.values()) {
      if (!designation.active) continue;

      let matchType: SanctionMatch['matchType'] | null = null;
      let confidence = 0;
      const matchedFields: string[] = [];

      // Exact name match
      if (designation.name.toLowerCase() === nameLower) {
        matchType = 'EXACT';
        confidence = 1.0;
        matchedFields.push('name');
      }
      // Alias match
      else if (
        designation.aliases.some(alias => alias.toLowerCase() === nameLower)
      ) {
        matchType = 'ALIAS';
        confidence = 0.95;
        matchedFields.push('alias');
      }
      // Fuzzy match
      else if (this.fuzzyMatch(nameLower, designation.name.toLowerCase())) {
        matchType = 'FUZZY';
        confidence = this.calculateFuzzyConfidence(nameLower, designation.name.toLowerCase());
        matchedFields.push('name');
      }

      // Identifier match
      if (identifiers.length > 0 && designation.identifiers.length > 0) {
        for (const id of identifiers) {
          for (const desigId of designation.identifiers) {
            if (id.type === desigId.type && id.value === desigId.value) {
              matchType = 'EXACT';
              confidence = 1.0;
              matchedFields.push(`identifier:${id.type}`);
              break;
            }
          }
        }
      }

      // Add match if confidence meets threshold
      if (matchType && confidence >= this.config.fuzzyMatchThreshold) {
        matches.push({
          designationId: designation.id,
          matchType,
          confidence,
          matchedFields,
          sanctionDetails: designation,
          risk: this.determineRisk(designation, confidence)
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Fuzzy string matching
   */
  private fuzzyMatch(str1: string, str2: string): boolean {
    const similarity = this.calculateSimilarity(str1, str2);
    return similarity >= this.config.fuzzyMatchThreshold;
  }

  /**
   * Calculate string similarity (Levenshtein distance based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate fuzzy match confidence
   */
  private calculateFuzzyConfidence(str1: string, str2: string): number {
    return this.calculateSimilarity(str1, str2);
  }

  /**
   * Determine risk level for match
   */
  private determineRisk(
    designation: SanctionDesignation,
    confidence: number
  ): ComplianceRiskLevel {
    // High confidence exact match on active designation
    if (confidence >= 0.95 && designation.active) {
      // Check for most severe sanction types
      const severeTypes = [
        SanctionType.ASSET_FREEZE,
        SanctionType.TRADE_EMBARGO,
        SanctionType.FINANCIAL_SANCTIONS
      ];

      if (designation.sanctionTypes.some(st => severeTypes.includes(st))) {
        return ComplianceRiskLevel.PROHIBITED;
      }

      return ComplianceRiskLevel.CRITICAL;
    }

    // Good confidence match
    if (confidence >= 0.85) {
      return ComplianceRiskLevel.HIGH;
    }

    // Moderate confidence
    if (confidence >= 0.75) {
      return ComplianceRiskLevel.MEDIUM;
    }

    return ComplianceRiskLevel.LOW;
  }

  /**
   * Calculate overall risk from multiple matches
   */
  private calculateOverallRisk(matches: SanctionMatch[]): ComplianceRiskLevel {
    if (matches.length === 0) {
      return ComplianceRiskLevel.LOW;
    }

    // Return highest risk level
    const riskLevels = [
      ComplianceRiskLevel.LOW,
      ComplianceRiskLevel.MEDIUM,
      ComplianceRiskLevel.HIGH,
      ComplianceRiskLevel.CRITICAL,
      ComplianceRiskLevel.PROHIBITED
    ];

    let maxRisk = ComplianceRiskLevel.LOW;
    let maxRiskIndex = 0;

    for (const match of matches) {
      const riskIndex = riskLevels.indexOf(match.risk);
      if (riskIndex > maxRiskIndex) {
        maxRiskIndex = riskIndex;
        maxRisk = match.risk;
      }
    }

    return maxRisk;
  }

  /**
   * Check if designation meets monitoring criteria
   */
  private meetsMonitoringCriteria(designation: SanctionDesignation): boolean {
    // Check regime
    if (
      this.config.regimes.length > 0 &&
      !this.config.regimes.includes(designation.regime)
    ) {
      return false;
    }

    // Check sanction types
    if (
      this.config.sanctionTypes.length > 0 &&
      !designation.sanctionTypes.some(st => this.config.sanctionTypes.includes(st))
    ) {
      return false;
    }

    // Check entity types
    if (
      this.config.entityTypes.length > 0 &&
      !this.config.entityTypes.includes(designation.entityType)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check if alert should be generated for designation
   */
  private shouldAlert(designation: SanctionDesignation): boolean {
    if (!this.config.enableAlerts) {
      return false;
    }

    // Always alert for new active designations
    return designation.active;
  }

  /**
   * Check if alert should be generated for match
   */
  private shouldAlertForMatch(check: ComplianceCheck): boolean {
    if (!this.config.enableAlerts) {
      return false;
    }

    const riskLevels = [
      ComplianceRiskLevel.LOW,
      ComplianceRiskLevel.MEDIUM,
      ComplianceRiskLevel.HIGH,
      ComplianceRiskLevel.CRITICAL,
      ComplianceRiskLevel.PROHIBITED
    ];

    const thresholdIndex = riskLevels.indexOf(
      this.config.alertThresholds.riskLevel
    );
    const checkRiskIndex = riskLevels.indexOf(check.overallRisk);

    return checkRiskIndex >= thresholdIndex;
  }

  /**
   * Check if screening requires manual review
   */
  private requiresReview(risk: ComplianceRiskLevel): boolean {
    return this.config.requireApprovalFor.includes(risk);
  }

  /**
   * Generate alert for new/updated designation
   */
  private async generateDesignationAlert(
    designation: SanctionDesignation,
    isUpdate: boolean
  ): Promise<void> {
    const alert: Alert = {
      id: `alert-${designation.id}-${Date.now()}`,
      alertType: isUpdate ? 'SANCTION_UPDATE' : 'NEW_DESIGNATION',
      severity: 'WARNING',
      title: isUpdate
        ? `Sanction Updated: ${designation.name}`
        : `New Sanction: ${designation.name}`,
      message: `${designation.regime} - ${designation.sanctionTypes.join(', ')}`,
      timestamp: new Date(),
      designationId: designation.id,
      acknowledged: false,
      actionRequired: true,
      recipients: [],
      metadata: {}
    };

    this.emit('alert', alert);
  }

  /**
   * Generate alert for screening match
   */
  private async generateMatchAlert(check: ComplianceCheck): Promise<void> {
    const severity =
      check.overallRisk === ComplianceRiskLevel.PROHIBITED ||
      check.overallRisk === ComplianceRiskLevel.CRITICAL
        ? 'CRITICAL'
        : 'WARNING';

    const alert: Alert = {
      id: `alert-match-${check.id}`,
      alertType: 'MATCH_DETECTED',
      severity,
      title: `Sanctions Match Detected: ${check.entityName}`,
      message: `Found ${check.matches.length} match(es) - Risk: ${check.overallRisk}`,
      timestamp: new Date(),
      checkId: check.id,
      acknowledged: false,
      actionRequired: true,
      recipients: [],
      metadata: {
        matches: check.matches.length,
        blocked: check.blockedTransaction
      }
    };

    this.emit('alert', alert);
  }

  /**
   * Get active list names
   */
  private getActiveListNames(): string[] {
    return this.config.regimes.map(r => `${r}_SANCTIONS_LIST`);
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ComplianceMetrics {
    return {
      totalScreenings: 0,
      averageScreeningTime: 0,
      matchRate: 0,
      falsePositiveRate: 0,
      highRiskEntities: 0,
      criticalRiskEntities: 0,
      totalRiskExposure: 0,
      totalViolations: 0,
      resolvedViolations: 0,
      averageResolutionTime: 0,
      complianceScore: 100,
      designationsTracked: 0,
      updatesProcessed: 0,
      lastUpdateTime: new Date()
    };
  }
}
