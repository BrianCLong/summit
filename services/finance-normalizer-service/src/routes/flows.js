"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowRoutes = void 0;
const express_1 = require("express");
const QueryService_js_1 = require("../services/QueryService.js");
const FlowDetectionService_js_1 = require("../services/FlowDetectionService.js");
const finance_normalizer_types_1 = require("@intelgraph/finance-normalizer-types");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.flowRoutes = (0, express_1.Router)();
/**
 * POST /api/v1/flows/query
 * Query flows between entities
 */
exports.flowRoutes.post('/query', async (req, res, next) => {
    try {
        const query = finance_normalizer_types_1.flowQuerySchema.parse(req.body);
        const result = await QueryService_js_1.queryService.queryFlows(query, req.tenantId);
        // Serialize BigInt values in results
        const serializedResults = Array.isArray(result.results)
            ? result.results.map(serializeFlowItem)
            : result.results;
        res.json({
            ...result,
            results: serializedResults,
            summary: result.summary
                ? {
                    ...result.summary,
                    totalGrossFlow: serializeMonetaryAmount(result.summary.totalGrossFlow),
                    totalNetFlow: serializeMonetaryAmount(result.summary.totalNetFlow),
                    averageTransactionSize: result.summary.averageTransactionSize
                        ? serializeMonetaryAmount(result.summary.averageTransactionSize)
                        : undefined,
                }
                : undefined,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/flows/between
 * Shorthand for querying flows between two entities
 */
exports.flowRoutes.get('/between', async (req, res, next) => {
    try {
        const { from, to, startDate, endDate, aggregation } = req.query;
        if (!from || !to || !startDate || !endDate) {
            throw new errorHandler_js_1.ValidationError('Missing required parameters: from, to, startDate, endDate');
        }
        const query = finance_normalizer_types_1.flowQuerySchema.parse({
            entityIds: [from],
            entityType: 'PARTY',
            counterpartyIds: [to],
            periodStart: startDate,
            periodEnd: endDate,
            aggregation: aggregation || 'NONE',
            limit: 1000,
            offset: 0,
            sortBy: 'DATE',
            sortOrder: 'ASC',
        });
        const result = await QueryService_js_1.queryService.queryFlows(query, req.tenantId);
        res.json({
            from,
            to,
            periodStart: startDate,
            periodEnd: endDate,
            results: Array.isArray(result.results)
                ? result.results.map(serializeFlowItem)
                : result.results,
            summary: result.summary
                ? {
                    ...result.summary,
                    totalGrossFlow: serializeMonetaryAmount(result.summary.totalGrossFlow),
                    totalNetFlow: serializeMonetaryAmount(result.summary.totalNetFlow),
                }
                : undefined,
            executionTimeMs: result.executionTimeMs,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/flows/patterns
 * Get detected flow patterns
 */
exports.flowRoutes.get('/patterns', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;
        const filters = {};
        if (req.query.type) {
            filters.type = req.query.type;
        }
        if (req.query.severity) {
            filters.severity = req.query.severity;
        }
        if (req.query.status) {
            filters.status = req.query.status;
        }
        if (req.query.startDate) {
            filters.startDate = req.query.startDate;
        }
        if (req.query.endDate) {
            filters.endDate = req.query.endDate;
        }
        if (req.query.partyId) {
            filters.partyId = req.query.partyId;
        }
        const result = await QueryService_js_1.queryService.getPatterns(req.tenantId, filters, limit, offset);
        res.json({
            patterns: result.patterns.map(serializePattern),
            total: result.total,
            limit,
            offset,
            hasMore: offset + result.patterns.length < result.total,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/flows/analyze
 * Analyze transactions for patterns (ad-hoc)
 */
exports.flowRoutes.post('/analyze', async (req, res, next) => {
    try {
        const { transactionIds, config } = req.body;
        if (!transactionIds || !Array.isArray(transactionIds)) {
            throw new errorHandler_js_1.ValidationError('transactionIds must be an array');
        }
        // Fetch transactions
        const transactions = [];
        for (const id of transactionIds) {
            const txn = await QueryService_js_1.queryService.getTransaction(id, req.tenantId);
            if (txn) {
                transactions.push(txn);
            }
        }
        // Analyze for patterns
        const patterns = await FlowDetectionService_js_1.flowDetectionService.analyzeTransactions(transactions, req.tenantId);
        res.json({
            analyzedTransactions: transactions.length,
            patternsDetected: patterns.length,
            patterns: patterns.map(serializePattern),
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/flows/aggregate
 * Build aggregated flows
 */
exports.flowRoutes.post('/aggregate', async (req, res, next) => {
    try {
        const { transactionIds, granularity = 'DAILY' } = req.body;
        if (!transactionIds || !Array.isArray(transactionIds)) {
            throw new errorHandler_js_1.ValidationError('transactionIds must be an array');
        }
        // Fetch transactions
        const transactions = [];
        for (const id of transactionIds) {
            const txn = await QueryService_js_1.queryService.getTransaction(id, req.tenantId);
            if (txn) {
                transactions.push(txn);
            }
        }
        // Build aggregated flows
        const flows = await FlowDetectionService_js_1.flowDetectionService.buildAggregatedFlows(transactions, granularity, req.tenantId);
        res.json({
            sourceTransactions: transactions.length,
            aggregatedFlows: flows.length,
            granularity,
            flows: flows.map(serializeAggregatedFlow),
        });
    }
    catch (error) {
        next(error);
    }
});
// Serialization helpers
function serializeFlowItem(item) {
    if (item.amount) {
        // It's a transaction
        return serializeTransaction(item);
    }
    // It's an aggregated flow
    return serializeAggregatedFlow(item);
}
function serializeTransaction(txn) {
    return {
        ...txn,
        amount: txn.amount ? serializeMonetaryAmount(txn.amount) : undefined,
        settlementAmount: txn.settlementAmount
            ? serializeMonetaryAmount(txn.settlementAmount)
            : undefined,
        totalFees: txn.totalFees ? serializeMonetaryAmount(txn.totalFees) : undefined,
        runningBalance: txn.runningBalance
            ? serializeMonetaryAmount(txn.runningBalance)
            : undefined,
    };
}
function serializeAggregatedFlow(flow) {
    return {
        ...flow,
        grossFlow: serializeMonetaryAmount(flow.grossFlow),
        netFlow: serializeMonetaryAmount(flow.netFlow),
        maxTransaction: flow.maxTransaction
            ? serializeMonetaryAmount(flow.maxTransaction)
            : undefined,
        minTransaction: flow.minTransaction
            ? serializeMonetaryAmount(flow.minTransaction)
            : undefined,
        averageTransactionSize: flow.averageTransactionSize
            ? serializeMonetaryAmount(flow.averageTransactionSize)
            : undefined,
        byTransactionType: flow.byTransactionType?.map((t) => ({
            ...t,
            totalAmount: serializeMonetaryAmount(t.totalAmount),
        })),
    };
}
function serializePattern(pattern) {
    return {
        ...pattern,
        totalValue: serializeMonetaryAmount(pattern.totalValue),
        averageTransactionValue: pattern.averageTransactionValue
            ? serializeMonetaryAmount(pattern.averageTransactionValue)
            : undefined,
    };
}
function serializeMonetaryAmount(amount) {
    if (!amount)
        return undefined;
    const divisor = Math.pow(10, amount.decimalPlaces || 2);
    const value = Number(amount.minorUnits) / divisor;
    return {
        ...amount,
        minorUnits: amount.minorUnits.toString(),
        value,
        formatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: amount.currency || 'USD',
        }).format(value),
    };
}
