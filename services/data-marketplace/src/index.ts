/**
 * Data Marketplace Service
 *
 * Enables trading and reuse of data at global scale with
 * blockchain-backed transactions and automatic settlements.
 */

import Fastify from 'fastify';
import { z } from 'zod';
import { ListingManager } from './listing-manager.js';
import { TransactionEngine } from './transaction-engine.js';
import { SmartContractBridge } from './smart-contract-bridge.js';

const ListingSchema = z.object({
  poolId: z.string(),
  sellerId: z.string(),
  price: z.object({
    amount: z.number(),
    currency: z.string(),
    model: z.enum(['per_query', 'per_record', 'subscription', 'one_time']),
  }),
  terms: z.object({
    usageRights: z.array(z.string()),
    restrictions: z.array(z.string()).optional(),
    attribution: z.boolean(),
    exclusivity: z.boolean().optional(),
  }),
  metadata: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    sampleAvailable: z.boolean(),
  }),
});

const PurchaseSchema = z.object({
  listingId: z.string(),
  buyerId: z.string(),
  paymentMethod: z.string(),
  signature: z.string(),
});

export type Listing = z.infer<typeof ListingSchema>;
export type Purchase = z.infer<typeof PurchaseSchema>;

const fastify = Fastify({ logger: true });
const listingManager = new ListingManager();
const transactionEngine = new TransactionEngine();
const smartContractBridge = new SmartContractBridge();

fastify.get('/health', async () => ({ status: 'healthy', service: 'data-marketplace' }));

// Create listing
fastify.post('/listings', async (request) => {
  const listing = ListingSchema.parse(request.body);
  const result = await listingManager.createListing(listing);
  return { success: true, listingId: result.listingId };
});

// Search listings
fastify.get('/listings', async (request) => {
  const { query, tags, minPrice, maxPrice, model } = request.query as {
    query?: string;
    tags?: string;
    minPrice?: string;
    maxPrice?: string;
    model?: string;
  };
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
  const { listingId } = request.params as { listingId: string };
  const listing = await listingManager.getListing(listingId);
  return { listing };
});

// Purchase data access
fastify.post('/listings/:listingId/purchase', async (request) => {
  const purchase = PurchaseSchema.parse({
    ...(request.body as object),
    listingId: (request.params as { listingId: string }).listingId,
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
  const { userId, role } = request.query as { userId: string; role?: 'buyer' | 'seller' };
  const transactions = await transactionEngine.getTransactions(userId, role);
  return { transactions };
});

// Revenue analytics
fastify.get('/analytics/revenue', async (request) => {
  const { sellerId, period } = request.query as { sellerId: string; period?: string };
  const analytics = await transactionEngine.getRevenueAnalytics(sellerId, period);
  return { analytics };
});

// Verify data license
fastify.get('/licenses/:transactionId', async (request) => {
  const { transactionId } = request.params as { transactionId: string };
  const license = await transactionEngine.verifyLicense(transactionId);
  return { license };
});

const start = async () => {
  const port = parseInt(process.env.PORT || '3102');
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`Data Marketplace listening on port ${port}`);
};

start().catch(console.error);

export { listingManager, transactionEngine, smartContractBridge };
