"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRoutes = void 0;
const express_1 = require("express");
const QueryService_js_1 = require("../services/QueryService.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
exports.transactionRoutes = (0, express_1.Router)();
/**
 * GET /api/v1/transactions
 * List transactions with filters
 */
exports.transactionRoutes.get('/', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 1000);
        const offset = parseInt(req.query.offset) || 0;
        const filters = {};
        if (req.query.accountId) {
            filters.accountId = req.query.accountId;
        }
        if (req.query.partyId) {
            filters.partyId = req.query.partyId;
        }
        if (req.query.startDate) {
            filters.startDate = req.query.startDate;
        }
        if (req.query.endDate) {
            filters.endDate = req.query.endDate;
        }
        if (req.query.type) {
            filters.type = req.query.type;
        }
        if (req.query.status) {
            filters.status = req.query.status;
        }
        if (req.query.minAmount) {
            filters.minAmount = parseFloat(req.query.minAmount);
        }
        if (req.query.maxAmount) {
            filters.maxAmount = parseFloat(req.query.maxAmount);
        }
        const result = await QueryService_js_1.queryService.listTransactions(req.tenantId, filters, limit, offset);
        // Serialize BigInt values
        const serializedTransactions = result.transactions.map(serializeTransaction);
        res.json({
            transactions: serializedTransactions,
            total: result.total,
            limit,
            offset,
            hasMore: offset + result.transactions.length < result.total,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/transactions/:id
 * Get transaction by ID
 */
exports.transactionRoutes.get('/:id', async (req, res, next) => {
    try {
        const transaction = await QueryService_js_1.queryService.getTransaction(req.params.id, req.tenantId);
        if (!transaction) {
            throw new errorHandler_js_1.NotFoundError('Transaction', req.params.id);
        }
        res.json(serializeTransaction(transaction));
    }
    catch (error) {
        next(error);
    }
});
/**
 * Serialize transaction for JSON response (handle BigInt)
 */
function serializeTransaction(txn) {
    return {
        ...txn,
        amount: txn.amount
            ? {
                ...txn.amount,
                minorUnits: txn.amount.minorUnits.toString(),
                formatted: formatAmount(txn.amount),
            }
            : undefined,
        settlementAmount: txn.settlementAmount
            ? {
                ...txn.settlementAmount,
                minorUnits: txn.settlementAmount.minorUnits.toString(),
                formatted: formatAmount(txn.settlementAmount),
            }
            : undefined,
        totalFees: txn.totalFees
            ? {
                ...txn.totalFees,
                minorUnits: txn.totalFees.minorUnits.toString(),
                formatted: formatAmount(txn.totalFees),
            }
            : undefined,
        runningBalance: txn.runningBalance
            ? {
                ...txn.runningBalance,
                minorUnits: txn.runningBalance.minorUnits.toString(),
                formatted: formatAmount(txn.runningBalance),
            }
            : undefined,
        unitPrice: txn.unitPrice
            ? {
                ...txn.unitPrice,
                minorUnits: txn.unitPrice.minorUnits.toString(),
                formatted: formatAmount(txn.unitPrice),
            }
            : undefined,
        fees: txn.fees?.map((fee) => ({
            ...fee,
            amount: fee.amount
                ? {
                    ...fee.amount,
                    minorUnits: fee.amount.minorUnits.toString(),
                    formatted: formatAmount(fee.amount),
                }
                : undefined,
        })),
    };
}
function formatAmount(amount) {
    const divisor = Math.pow(10, amount.decimalPlaces);
    const value = Number(amount.minorUnits) / divisor;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: amount.currency,
    }).format(value);
}
