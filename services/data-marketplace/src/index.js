"use strict";
/**
 * Data Marketplace Service
 *
 * Enables trading and reuse of data at global scale with
 * blockchain-backed transactions and automatic settlements.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartContractBridge = exports.transactionEngine = exports.listingManager = void 0;
const fastify_1 = __importDefault(require("fastify"));
const zod_1 = require("zod");
const listing_manager_js_1 = require("./listing-manager.js");
const transaction_engine_js_1 = require("./transaction-engine.js");
const smart_contract_bridge_js_1 = require("./smart-contract-bridge.js");
const ListingSchema = zod_1.z.object({
    poolId: zod_1.z.string(),
    sellerId: zod_1.z.string(),
    price: zod_1.z.object({
        amount: zod_1.z.number(),
        currency: zod_1.z.string(),
        model: zod_1.z.enum(['per_query', 'per_record', 'subscription', 'one_time']),
    }),
    terms: zod_1.z.object({
        usageRights: zod_1.z.array(zod_1.z.string()),
        restrictions: zod_1.z.array(zod_1.z.string()).optional(),
        attribution: zod_1.z.boolean(),
        exclusivity: zod_1.z.boolean().optional(),
    }),
    metadata: zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        tags: zod_1.z.array(zod_1.z.string()),
        sampleAvailable: zod_1.z.boolean(),
    }),
});
const PurchaseSchema = zod_1.z.object({
    listingId: zod_1.z.string(),
    buyerId: zod_1.z.string(),
    paymentMethod: zod_1.z.string(),
    signature: zod_1.z.string(),
});
const fastify = (0, fastify_1.default)({ logger: true });
const listingManager = new listing_manager_js_1.ListingManager();
exports.listingManager = listingManager;
const transactionEngine = new transaction_engine_js_1.TransactionEngine();
exports.transactionEngine = transactionEngine;
const smartContractBridge = new smart_contract_bridge_js_1.SmartContractBridge();
exports.smartContractBridge = smartContractBridge;
fastify.get('/health', async () => ({ status: 'healthy', service: 'data-marketplace' }));
// Create listing
fastify.post('/listings', async (request) => {
    const listing = ListingSchema.parse(request.body);
    const result = await listingManager.createListing(listing);
    return { success: true, listingId: result.listingId };
});
// Search listings
fastify.get('/listings', async (request) => {
    const { query, tags, minPrice, maxPrice, model } = request.query;
    const listings = await listingManager.searchListings({
        query,
        tags: tags?.split(','),
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        model,
    });
    return { listings };
});
// Get listing details
fastify.get('/listings/:listingId', async (request) => {
    const { listingId } = request.params;
    const listing = await listingManager.getListing(listingId);
    return { listing };
});
// Purchase data access
fastify.post('/listings/:listingId/purchase', async (request) => {
    const purchase = PurchaseSchema.parse({
        ...request.body,
        listingId: request.params.listingId,
    });
    // Execute on-chain transaction
    const txResult = await smartContractBridge.executeDataPurchase(purchase);
    // Record transaction
    const transaction = await transactionEngine.recordTransaction({
        purchase,
        blockchainTx: txResult,
    });
    return {
        success: true,
        transactionId: transaction.id,
        accessToken: transaction.accessToken,
        blockchainTxHash: txResult.txHash,
    };
});
// Get transaction history
fastify.get('/transactions', async (request) => {
    const { userId, role } = request.query;
    const transactions = await transactionEngine.getTransactions(userId, role);
    return { transactions };
});
// Revenue analytics
fastify.get('/analytics/revenue', async (request) => {
    const { sellerId, period } = request.query;
    const analytics = await transactionEngine.getRevenueAnalytics(sellerId, period);
    return { analytics };
});
// Verify data license
fastify.get('/licenses/:transactionId', async (request) => {
    const { transactionId } = request.params;
    const license = await transactionEngine.verifyLicense(transactionId);
    return { license };
});
const start = async () => {
    const port = parseInt(process.env.PORT || '3102');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Data Marketplace listening on port ${port}`);
};
start().catch(console.error);
