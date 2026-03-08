"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowDetectionService = exports.FlowDetectionService = void 0;
const uuid_1 = require("uuid");
const finance_normalizer_types_1 = require("@intelgraph/finance-normalizer-types");
const DEFAULT_CONFIG = {
    minTransactionCount: 3,
    timeWindowHours: 24,
    minConfidence: 0.7,
    structuringThresholdMinorUnits: BigInt(1000000), // $10,000 in cents
    structuringTolerancePercent: 10,
    velocitySpikeMinTransactions: 5,
    velocitySpikeMultiplier: 3,
};
/**
 * Flow Detection Service
 * Detects financial patterns like fan-in/fan-out, structuring, layering, etc.
 */
class FlowDetectionService {
    config;
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Analyze transactions for all pattern types
     */
    async analyzeTransactions(transactions, tenantId) {
        const patterns = [];
        if (transactions.length < this.config.minTransactionCount) {
            return patterns;
        }
        // Group transactions by party for analysis
        const byOriginator = this.groupByParty(transactions, 'originator');
        const byBeneficiary = this.groupByParty(transactions, 'beneficiary');
        // Detect various patterns
        const fanInPatterns = await this.detectFanIn(byBeneficiary, tenantId);
        const fanOutPatterns = await this.detectFanOut(byOriginator, tenantId);
        const structuringPatterns = await this.detectStructuring(transactions, tenantId);
        const rapidMovementPatterns = await this.detectRapidMovement(transactions, tenantId);
        const roundTripPatterns = await this.detectRoundTrip(transactions, tenantId);
        patterns.push(...fanInPatterns, ...fanOutPatterns, ...structuringPatterns, ...rapidMovementPatterns, ...roundTripPatterns);
        return patterns;
    }
    /**
     * Detect Fan-In patterns (multiple sources to single destination)
     */
    async detectFanIn(groupedByBeneficiary, tenantId) {
        const patterns = [];
        for (const [beneficiaryId, txns] of groupedByBeneficiary.entries()) {
            // Get unique originators
            const originators = new Set(txns.map(t => t.originatorId).filter(Boolean));
            if (originators.size >= this.config.minTransactionCount) {
                const timeWindowMs = this.config.timeWindowHours * 60 * 60 * 1000;
                const sortedTxns = [...txns].sort((a, b) => new Date(a.valueDate).getTime() - new Date(b.valueDate).getTime());
                // Check if transactions are within time window
                const firstTime = new Date(sortedTxns[0].valueDate).getTime();
                const lastTime = new Date(sortedTxns[sortedTxns.length - 1].valueDate).getTime();
                if (lastTime - firstTime <= timeWindowMs) {
                    const totalAmount = this.sumAmounts(txns);
                    const confidence = this.calculateConfidence(originators.size, txns.length);
                    if (confidence >= this.config.minConfidence) {
                        patterns.push(this.createPattern('FAN_IN', `Fan-in to party ${beneficiaryId}`, `${originators.size} distinct parties sent funds to single beneficiary within ${this.config.timeWindowHours} hours`, this.calculateSeverity(totalAmount, originators.size), confidence, sortedTxns, [beneficiaryId], Array.from(originators), tenantId));
                    }
                }
            }
        }
        return patterns;
    }
    /**
     * Detect Fan-Out patterns (single source to multiple destinations)
     */
    async detectFanOut(groupedByOriginator, tenantId) {
        const patterns = [];
        for (const [originatorId, txns] of groupedByOriginator.entries()) {
            // Get unique beneficiaries
            const beneficiaries = new Set(txns.map(t => t.beneficiaryId).filter(Boolean));
            if (beneficiaries.size >= this.config.minTransactionCount) {
                const timeWindowMs = this.config.timeWindowHours * 60 * 60 * 1000;
                const sortedTxns = [...txns].sort((a, b) => new Date(a.valueDate).getTime() - new Date(b.valueDate).getTime());
                const firstTime = new Date(sortedTxns[0].valueDate).getTime();
                const lastTime = new Date(sortedTxns[sortedTxns.length - 1].valueDate).getTime();
                if (lastTime - firstTime <= timeWindowMs) {
                    const totalAmount = this.sumAmounts(txns);
                    const confidence = this.calculateConfidence(beneficiaries.size, txns.length);
                    if (confidence >= this.config.minConfidence) {
                        patterns.push(this.createPattern('FAN_OUT', `Fan-out from party ${originatorId}`, `Single party distributed funds to ${beneficiaries.size} distinct beneficiaries within ${this.config.timeWindowHours} hours`, this.calculateSeverity(totalAmount, beneficiaries.size), confidence, sortedTxns, [originatorId], Array.from(beneficiaries), tenantId));
                    }
                }
            }
        }
        return patterns;
    }
    /**
     * Detect structuring patterns (breaking amounts below reporting thresholds)
     */
    async detectStructuring(transactions, tenantId) {
        const patterns = [];
        const threshold = this.config.structuringThresholdMinorUnits;
        const toleranceMultiplier = BigInt(100 - this.config.structuringTolerancePercent) / BigInt(100);
        const lowerBound = threshold * toleranceMultiplier / BigInt(100) * BigInt(100);
        // Group by originator and time period
        const grouped = this.groupByParty(transactions, 'originator');
        for (const [originatorId, txns] of grouped.entries()) {
            // Find transactions just below threshold
            const nearThreshold = txns.filter(t => {
                const amount = (0, finance_normalizer_types_1.absMonetaryAmount)(t.amount);
                return amount.minorUnits >= lowerBound && amount.minorUnits < threshold;
            });
            if (nearThreshold.length >= this.config.minTransactionCount) {
                // Check if they're within time window
                const timeWindowMs = this.config.timeWindowHours * 60 * 60 * 1000;
                const sortedTxns = [...nearThreshold].sort((a, b) => new Date(a.valueDate).getTime() - new Date(b.valueDate).getTime());
                const firstTime = new Date(sortedTxns[0].valueDate).getTime();
                const lastTime = new Date(sortedTxns[sortedTxns.length - 1].valueDate).getTime();
                if (lastTime - firstTime <= timeWindowMs) {
                    const totalAmount = this.sumAmounts(nearThreshold);
                    // Check if total exceeds threshold
                    if (totalAmount.minorUnits >= threshold) {
                        const confidence = 0.8 + (nearThreshold.length / 20) * 0.2; // Higher confidence with more transactions
                        patterns.push(this.createPattern('STRUCTURING', `Potential structuring by ${originatorId}`, `${nearThreshold.length} transactions just below ${this.formatAmount(threshold)} threshold, totaling ${this.formatAmount(totalAmount.minorUnits)}`, 'HIGH', Math.min(confidence, 0.99), sortedTxns, [originatorId], [], tenantId, { threshold: threshold.toString(), count: nearThreshold.length }));
                    }
                }
            }
        }
        return patterns;
    }
    /**
     * Detect rapid movement patterns (quick in/out)
     */
    async detectRapidMovement(transactions, tenantId) {
        const patterns = [];
        // Group by account
        const byAccount = new Map();
        for (const txn of transactions) {
            const accountId = txn.sourceAccountId || txn.destinationAccountId;
            if (accountId) {
                if (!byAccount.has(accountId)) {
                    byAccount.set(accountId, []);
                }
                byAccount.get(accountId).push(txn);
            }
        }
        for (const [accountId, txns] of byAccount.entries()) {
            if (txns.length < 2)
                continue;
            const sortedTxns = [...txns].sort((a, b) => new Date(a.valueDate).getTime() - new Date(b.valueDate).getTime());
            // Look for credits followed quickly by debits of similar amounts
            for (let i = 0; i < sortedTxns.length - 1; i++) {
                const credit = sortedTxns[i];
                if (credit.direction !== 'CREDIT')
                    continue;
                for (let j = i + 1; j < sortedTxns.length; j++) {
                    const debit = sortedTxns[j];
                    if (debit.direction !== 'DEBIT')
                        continue;
                    const timeDiff = new Date(debit.valueDate).getTime() - new Date(credit.valueDate).getTime();
                    const hoursDiff = timeDiff / (1000 * 60 * 60);
                    // Check if within 24 hours and similar amounts (within 5%)
                    if (hoursDiff <= 24) {
                        const creditAmt = (0, finance_normalizer_types_1.absMonetaryAmount)(credit.amount);
                        const debitAmt = (0, finance_normalizer_types_1.absMonetaryAmount)(debit.amount);
                        const ratio = Number(creditAmt.minorUnits) / Number(debitAmt.minorUnits);
                        if (ratio >= 0.95 && ratio <= 1.05) {
                            const confidence = 0.7 + (1 - hoursDiff / 24) * 0.2;
                            patterns.push(this.createPattern('RAPID_MOVEMENT', `Rapid movement through account ${accountId}`, `Credit of ${this.formatAmount(creditAmt.minorUnits)} followed by debit of ${this.formatAmount(debitAmt.minorUnits)} within ${hoursDiff.toFixed(1)} hours`, 'MEDIUM', confidence, [credit, debit], [], [], tenantId, { hoursBetween: hoursDiff }));
                            break;
                        }
                    }
                }
            }
        }
        return patterns;
    }
    /**
     * Detect round-trip patterns (funds returning to origin)
     */
    async detectRoundTrip(transactions, tenantId) {
        const patterns = [];
        // Build graph of transfers
        const edges = [];
        for (const txn of transactions) {
            if (txn.originatorId && txn.beneficiaryId) {
                edges.push({
                    from: txn.originatorId,
                    to: txn.beneficiaryId,
                    txn,
                });
            }
        }
        // Look for cycles (A -> B -> ... -> A)
        const visited = new Set();
        for (const edge of edges) {
            if (visited.has(edge.from))
                continue;
            const path = this.findCycle(edge.from, edges);
            if (path.length >= 3) {
                const cycleTxns = path.map(e => e.txn);
                const totalAmount = this.sumAmounts(cycleTxns);
                patterns.push(this.createPattern('CIRCULAR', `Circular flow detected`, `Funds cycled through ${path.length} parties returning to origin`, 'HIGH', 0.85, cycleTxns, [edge.from], path.map(e => e.to), tenantId));
                path.forEach(e => visited.add(e.from));
            }
        }
        return patterns;
    }
    /**
     * Build aggregated flows between counterparties
     */
    async buildAggregatedFlows(transactions, granularity, tenantId) {
        const flows = new Map();
        for (const txn of transactions) {
            const sourceId = txn.originatorId || txn.sourceAccountId;
            const destId = txn.beneficiaryId || txn.destinationAccountId;
            if (!sourceId || !destId)
                continue;
            const periodKey = this.getPeriodKey(txn.valueDate, granularity);
            const flowKey = `${sourceId}->${destId}:${periodKey}`;
            if (!flows.has(flowKey)) {
                const { start, end } = this.getPeriodBounds(txn.valueDate, granularity);
                flows.set(flowKey, {
                    id: (0, uuid_1.v4)(),
                    sourceId,
                    sourceType: txn.originatorId ? 'PARTY' : 'ACCOUNT',
                    destinationId: destId,
                    destinationType: txn.beneficiaryId ? 'PARTY' : 'ACCOUNT',
                    periodStart: start,
                    periodEnd: end,
                    granularity,
                    grossFlow: (0, finance_normalizer_types_1.createMonetaryAmount)(0, txn.amount.currency),
                    netFlow: (0, finance_normalizer_types_1.createMonetaryAmount)(0, txn.amount.currency),
                    transactionCount: 0,
                    creditCount: 0,
                    debitCount: 0,
                    byTransactionType: [],
                    tenantId,
                    createdAt: new Date().toISOString(),
                });
            }
            const flow = flows.get(flowKey);
            const amount = (0, finance_normalizer_types_1.absMonetaryAmount)(txn.amount);
            flow.grossFlow = (0, finance_normalizer_types_1.addMonetaryAmounts)(flow.grossFlow, amount);
            flow.transactionCount++;
            if (txn.direction === 'CREDIT') {
                flow.creditCount++;
                flow.netFlow = (0, finance_normalizer_types_1.addMonetaryAmounts)(flow.netFlow, amount);
            }
            else {
                flow.debitCount++;
                flow.netFlow = (0, finance_normalizer_types_1.subtractMonetaryAmounts)(flow.netFlow, amount);
            }
            // Update by type breakdown
            const typeEntry = flow.byTransactionType.find(e => e.type === txn.type);
            if (typeEntry) {
                typeEntry.count++;
                typeEntry.totalAmount = (0, finance_normalizer_types_1.addMonetaryAmounts)(typeEntry.totalAmount, amount);
            }
            else {
                flow.byTransactionType.push({
                    type: txn.type,
                    count: 1,
                    totalAmount: amount,
                });
            }
        }
        return Array.from(flows.values());
    }
    // Helper methods
    groupByParty(transactions, partyType) {
        const grouped = new Map();
        for (const txn of transactions) {
            const partyId = partyType === 'originator' ? txn.originatorId : txn.beneficiaryId;
            if (partyId) {
                if (!grouped.has(partyId)) {
                    grouped.set(partyId, []);
                }
                grouped.get(partyId).push(txn);
            }
        }
        return grouped;
    }
    sumAmounts(transactions) {
        if (transactions.length === 0) {
            return (0, finance_normalizer_types_1.createMonetaryAmount)(0, 'USD');
        }
        const currency = transactions[0].amount.currency;
        let total = (0, finance_normalizer_types_1.createMonetaryAmount)(0, currency);
        for (const txn of transactions) {
            total = (0, finance_normalizer_types_1.addMonetaryAmounts)(total, (0, finance_normalizer_types_1.absMonetaryAmount)(txn.amount));
        }
        return total;
    }
    calculateConfidence(distinctParties, transactionCount) {
        // Higher confidence with more parties and transactions
        const partyFactor = Math.min(distinctParties / 10, 1) * 0.5;
        const txnFactor = Math.min(transactionCount / 20, 1) * 0.5;
        return 0.5 + partyFactor + txnFactor;
    }
    calculateSeverity(amount, partyCount) {
        const amountThreshold = this.config.structuringThresholdMinorUnits;
        if (amount.minorUnits >= amountThreshold * BigInt(10) && partyCount >= 10) {
            return 'CRITICAL';
        }
        if (amount.minorUnits >= amountThreshold * BigInt(5) && partyCount >= 5) {
            return 'HIGH';
        }
        if (amount.minorUnits >= amountThreshold && partyCount >= 3) {
            return 'MEDIUM';
        }
        if (partyCount >= 3) {
            return 'LOW';
        }
        return 'INFO';
    }
    createPattern(type, name, description, severity, confidence, transactions, primaryPartyIds, involvedPartyIds, tenantId, thresholds) {
        const sortedTxns = [...transactions].sort((a, b) => new Date(a.valueDate).getTime() - new Date(b.valueDate).getTime());
        const totalValue = this.sumAmounts(transactions);
        const periodStart = sortedTxns[0].valueDate;
        const periodEnd = sortedTxns[sortedTxns.length - 1].valueDate;
        const timeSpanHours = (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60);
        return {
            id: (0, uuid_1.v4)(),
            type,
            name,
            description,
            severity,
            confidence,
            periodStart,
            periodEnd,
            primaryPartyIds,
            involvedPartyIds: [...new Set([...primaryPartyIds, ...involvedPartyIds])],
            involvedAccountIds: [
                ...new Set(transactions
                    .flatMap(t => [t.sourceAccountId, t.destinationAccountId])
                    .filter(Boolean)),
            ],
            transactionIds: transactions.map(t => t.id),
            totalValue,
            transactionCount: transactions.length,
            timeSpanHours,
            detectionRule: `${type}_DETECTION`,
            ruleParameters: {},
            thresholds: thresholds ? Object.fromEntries(Object.entries(thresholds).map(([k, v]) => [k, typeof v === 'string' ? parseFloat(v) || 0 : v])) : {},
            reviewStatus: 'PENDING',
            tenantId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }
    findCycle(startNode, edges) {
        const visited = new Set();
        const path = [];
        const dfs = (current) => {
            if (current === startNode && path.length >= 2) {
                return true;
            }
            if (visited.has(current) && current !== startNode) {
                return false;
            }
            if (path.length > 0) {
                visited.add(current);
            }
            for (const edge of edges) {
                if (edge.from === current) {
                    path.push(edge);
                    if (dfs(edge.to)) {
                        return true;
                    }
                    path.pop();
                }
            }
            return false;
        };
        dfs(startNode);
        return path;
    }
    formatAmount(minorUnits) {
        const dollars = Number(minorUnits) / 100;
        return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
    getPeriodKey(date, granularity) {
        const d = new Date(date);
        switch (granularity) {
            case 'HOURLY':
                return `${d.toISOString().substring(0, 13)}`;
            case 'DAILY':
                return d.toISOString().substring(0, 10);
            case 'WEEKLY':
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                return weekStart.toISOString().substring(0, 10);
            case 'MONTHLY':
                return d.toISOString().substring(0, 7);
        }
    }
    getPeriodBounds(date, granularity) {
        const d = new Date(date);
        let start;
        let end;
        switch (granularity) {
            case 'HOURLY':
                start = new Date(d);
                start.setMinutes(0, 0, 0);
                end = new Date(start);
                end.setHours(end.getHours() + 1);
                break;
            case 'DAILY':
                start = new Date(d);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + 1);
                break;
            case 'WEEKLY':
                start = new Date(d);
                start.setDate(d.getDate() - d.getDay());
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + 7);
                break;
            case 'MONTHLY':
                start = new Date(d.getFullYear(), d.getMonth(), 1);
                end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                break;
        }
        return {
            start: start.toISOString(),
            end: end.toISOString(),
        };
    }
}
exports.FlowDetectionService = FlowDetectionService;
exports.flowDetectionService = new FlowDetectionService();
