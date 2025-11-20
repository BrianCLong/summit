/**
 * Finance Tracker
 * Tracks terrorist financing flows and networks
 */

import type {
  FinancialEntity,
  Transaction,
  HawalaNetwork,
  CryptoActivity,
  FrontCompany,
  CharityOperation,
  ExtortionOperation,
  KidnappingForRansom,
  DrugTrafficking,
  StateSponsor,
  AssetFreeze,
  Sanction,
  FinancialNetwork,
  MoneyLaunderingScheme,
  FinanceQuery,
  FinanceResult
} from './types.js';

export class FinanceTracker {
  private entities: Map<string, FinancialEntity> = new Map();
  private transactions: Transaction[] = [];
  private hawalaNetworks: Map<string, HawalaNetwork> = new Map();
  private cryptoActivities: Map<string, CryptoActivity> = new Map();
  private frontCompanies: Map<string, FrontCompany> = new Map();
  private charities: Map<string, CharityOperation> = new Map();
  private extortionOps: ExtortionOperation[] = [];
  private kidnappings: KidnappingForRansom[] = [];
  private drugTrafficking: DrugTrafficking[] = [];
  private stateSponsors: Map<string, StateSponsor> = new Map();
  private assetFreezes: Map<string, AssetFreeze[]> = new Map();
  private sanctions: Map<string, Sanction[]> = new Map();
  private networks: Map<string, FinancialNetwork> = new Map();
  private launderingSchemes: Map<string, MoneyLaunderingScheme> = new Map();

  /**
   * Track financial entity
   */
  async trackEntity(entity: FinancialEntity): Promise<void> {
    this.entities.set(entity.id, entity);
  }

  /**
   * Record transaction
   */
  async recordTransaction(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);

    if (transaction.suspicious || transaction.flagged) {
      await this.analyzeTransaction(transaction);
    }
  }

  /**
   * Track hawala network
   */
  async trackHawalaNetwork(network: HawalaNetwork): Promise<void> {
    this.hawalaNetworks.set(network.id, network);
  }

  /**
   * Monitor cryptocurrency activity
   */
  async monitorCryptoActivity(activity: CryptoActivity): Promise<void> {
    this.cryptoActivities.set(activity.entityId, activity);
  }

  /**
   * Identify front company
   */
  async identifyFrontCompany(company: FrontCompany): Promise<void> {
    this.frontCompanies.set(company.id, company);
  }

  /**
   * Monitor charity operation
   */
  async monitorCharity(charity: CharityOperation): Promise<void> {
    this.charities.set(charity.id, charity);
  }

  /**
   * Record extortion operation
   */
  async recordExtortion(operation: ExtortionOperation): Promise<void> {
    this.extortionOps.push(operation);
  }

  /**
   * Record kidnapping for ransom
   */
  async recordKidnapping(kidnapping: KidnappingForRansom): Promise<void> {
    this.kidnappings.push(kidnapping);
  }

  /**
   * Track drug trafficking
   */
  async trackDrugTrafficking(trafficking: DrugTrafficking): Promise<void> {
    this.drugTrafficking.push(trafficking);
  }

  /**
   * Track state sponsor
   */
  async trackStateSponsor(sponsor: StateSponsor): Promise<void> {
    this.stateSponsors.set(sponsor.country, sponsor);
  }

  /**
   * Record asset freeze
   */
  async recordAssetFreeze(freeze: AssetFreeze): Promise<void> {
    const existing = this.assetFreezes.get(freeze.entityId) || [];
    existing.push(freeze);
    this.assetFreezes.set(freeze.entityId, existing);

    // Update entity status
    const entity = this.entities.get(freeze.entityId);
    if (entity) {
      entity.status = 'FROZEN';
    }
  }

  /**
   * Record sanction
   */
  async recordSanction(sanction: Sanction): Promise<void> {
    const existing = this.sanctions.get(sanction.entityId) || [];
    existing.push(sanction);
    this.sanctions.set(sanction.entityId, existing);

    // Update entity
    const entity = this.entities.get(sanction.entityId);
    if (entity) {
      entity.sanctioned = true;
    }
  }

  /**
   * Identify financial network
   */
  async identifyNetwork(network: FinancialNetwork): Promise<void> {
    this.networks.set(network.id, network);
  }

  /**
   * Identify laundering scheme
   */
  async identifyLaunderingScheme(scheme: MoneyLaunderingScheme): Promise<void> {
    this.launderingSchemes.set(scheme.id, scheme);
  }

  /**
   * Query financial data
   */
  async query(query: FinanceQuery): Promise<FinanceResult> {
    let filteredEntities = Array.from(this.entities.values());
    let filteredTransactions = [...this.transactions];

    if (query.entityTypes && query.entityTypes.length > 0) {
      filteredEntities = filteredEntities.filter(e =>
        query.entityTypes!.includes(e.type)
      );
    }

    if (query.sanctioned !== undefined) {
      filteredEntities = filteredEntities.filter(e =>
        e.sanctioned === query.sanctioned
      );
    }

    if (query.transactionMethods && query.transactionMethods.length > 0) {
      filteredTransactions = filteredTransactions.filter(t =>
        query.transactionMethods!.includes(t.method)
      );
    }

    if (query.minAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(t =>
        t.amount >= query.minAmount!
      );
    }

    const totalFlow = filteredTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    return {
      entities: filteredEntities,
      transactions: filteredTransactions,
      networks: Array.from(this.networks.values()),
      totalFlow,
      trends: this.calculateTrends()
    };
  }

  /**
   * Get entity funding sources
   */
  async getFundingSources(entityId: string): Promise<{
    extortion: ExtortionOperation[];
    kidnapping: KidnappingForRansom[];
    drugTrafficking: DrugTrafficking[];
    stateSponsor?: StateSponsor;
    frontCompanies: FrontCompany[];
    charities: CharityOperation[];
  }> {
    return {
      extortion: this.extortionOps.filter(e => e.organizationId === entityId),
      kidnapping: this.kidnappings.filter(k => k.organizationId === entityId),
      drugTrafficking: this.drugTrafficking.filter(d => d.organizationId === entityId),
      stateSponsor: Array.from(this.stateSponsors.values()).find(s =>
        s.recipients.includes(entityId)
      ),
      frontCompanies: Array.from(this.frontCompanies.values()).filter(f =>
        f.linked.includes(entityId)
      ),
      charities: Array.from(this.charities.values()).filter(c =>
        c.diversion && c.name.includes(entityId)
      )
    };
  }

  /**
   * Trace transaction chain
   */
  async traceTransactionChain(transactionId: string): Promise<Transaction[]> {
    const chain: Transaction[] = [];
    const transaction = this.transactions.find(t => t.id === transactionId);

    if (!transaction) return chain;

    chain.push(transaction);

    // Find subsequent transactions (simplified)
    const related = this.transactions.filter(
      t => t.from === transaction.to && t.date > transaction.date
    );

    chain.push(...related);
    return chain;
  }

  /**
   * Calculate disruption impact
   */
  async calculateDisruptionImpact(entityId: string): Promise<{
    financialImpact: number;
    networkImpact: number;
    recommendation: string;
  }> {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return { financialImpact: 0, networkImpact: 0, recommendation: 'Entity not found' };
    }

    // Calculate financial impact
    const relatedTransactions = this.transactions.filter(
      t => t.from === entityId || t.to === entityId
    );
    const financialImpact = relatedTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    // Calculate network impact
    const connectedEntities = new Set(
      relatedTransactions.map(t => (t.from === entityId ? t.to : t.from))
    );
    const networkImpact = connectedEntities.size;

    const recommendation =
      entity.riskScore > 0.7
        ? 'High priority for disruption'
        : 'Consider for monitoring';

    return { financialImpact, networkImpact, recommendation };
  }

  /**
   * Private helper methods
   */

  private async analyzeTransaction(transaction: Transaction): Promise<void> {
    // Transaction analysis implementation
  }

  private calculateTrends() {
    return [
      {
        type: 'Transaction Volume',
        direction: 'STABLE' as const,
        magnitude: this.transactions.length,
        period: '30-days',
        description: `${this.transactions.length} transactions tracked`
      }
    ];
  }
}
