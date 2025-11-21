# Data Trading Marketplace - Design Reference Guide

**Purpose**: Quick reference for implementation patterns discovered during codebase analysis  
**Last Updated**: 2025-11-21

---

## Quick Pattern Reference

### 1. Service Boilerplate

Model your marketplace service on `services/catalog-service/`:

```typescript
// services/marketplace-service/src/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { marketplaceRouter } from './routes/marketplaceRoutes.js';
import { transactionRouter } from './routes/transactionRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.MARKETPLACE_SERVICE_PORT || 3200;

// Middleware stack (consistent with existing services)
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (required for k8s probes)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'marketplace-service' });
});

// API Routes
app.use('/api/v1/marketplace', marketplaceRouter);
app.use('/api/v1/transactions', transactionRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Marketplace Service listening on port ${PORT}`);
});

export default app;
```

### 2. GraphQL Schema Extension

Extend `packages/marketplace/schema.graphql`:

```graphql
scalar DateTime
scalar JSON

# Data Product / Asset for Sale
type DataProduct {
  id: ID!
  name: String!
  description: String!
  category: ProductCategory!
  
  # Provider info
  providerId: ID!
  provider: DataProvider!
  
  # Pricing & Licensing
  pricing: PricingModel!
  licenseTerms: String!
  
  # Data metadata
  schema: JSON!
  sampleData: JSON
  documentation: String
  
  # Quality & trust
  dataQualityScore: Float!
  trustScore: Float!
  reviews: [Review!]!
  
  # Marketplace status
  status: ListingStatus!
  published: DateTime
  updated: DateTime
  
  # Access control
  accessGrants: [AccessGrant!]!
  
  # Provenance
  sources: [Source!]!
  createdBy: User!
}

enum ProductCategory {
  INTELLIGENCE
  GEOSPATIAL
  FINANCIAL
  TELEMETRY
  IDENTITY
  CUSTOM
}

type DataProvider {
  id: ID!
  name: String!
  email: String!
  description: String
  verified: Boolean!
  rating: Float
  totalSales: Int!
  products: [DataProduct!]!
  revenueAccount: String!
}

enum ListingStatus {
  DRAFT
  PENDING_APPROVAL
  PUBLISHED
  SUSPENDED
  ARCHIVED
}

# Pricing Options
type PricingModel {
  id: ID!
  type: PricingType!
  
  # Fixed pricing
  pricePerAccess: Float
  
  # Subscription pricing
  monthlyPrice: Float
  
  # Usage-based pricing
  pricePerRecord: Float
  pricePerGB: Float
  
  # Volume discounts
  volumeDiscounts: [VolumeDiscount!]!
  
  currency: String! # ISO 4217
}

enum PricingType {
  FIXED
  SUBSCRIPTION
  PAY_PER_USE
  CUSTOM
}

type VolumeDiscount {
  minQuantity: Int!
  discount: Float! # Percentage 0-100
}

# Time-limited access grant
type AccessGrant {
  id: ID!
  buyerId: ID!
  productId: ID!
  
  status: GrantStatus!
  grantedAt: DateTime!
  expiresAt: DateTime!
  
  accessKey: String!
  accessUrl: String
  
  # Usage tracking
  recordsAccessed: Int!
  usageBytes: Float!
  lastAccessed: DateTime
}

enum GrantStatus {
  PENDING
  ACTIVE
  REVOKED
  EXPIRED
}

# Transaction record
type Transaction {
  id: ID!
  
  # Parties
  sellerId: ID!
  buyerId: ID!
  productId: ID!
  
  # Pricing
  amount: Float!
  currency: String! # ISO 4217
  quantity: Int # For usage-based
  
  # Status
  status: TransactionStatus!
  createdAt: DateTime!
  completedAt: DateTime
  
  # Payment
  paymentMethod: String!
  paymentRef: String
  
  # Revenue distribution
  platformFee: Float!
  sellerRevenue: Float!
  
  # Provenance
  accessGrant: AccessGrant!
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  DISPUTED
}

type Review {
  id: ID!
  rating: Float! # 1-5
  comment: String
  reviewer: User!
  product: DataProduct!
  createdAt: DateTime!
}

# Query operations
extend type Query {
  # Discovery
  dataProducts(
    category: ProductCategory
    search: String
    limit: Int
    offset: Int
  ): [DataProduct!]!
  
  dataProduct(id: ID!): DataProduct
  
  # Provider info
  dataProvider(id: ID!): DataProvider
  
  # Buyer's purchases
  myPurchases(limit: Int, offset: Int): [AccessGrant!]!
  myPurchase(id: ID!): AccessGrant
  
  # Transaction history
  myTransactions(limit: Int, offset: Int): [Transaction!]!
  
  # Provider dashboard
  myListings: [DataProduct!]!
  listingStats(productId: ID!): ListingStatistics!
}

type ListingStatistics {
  views: Int!
  purchases: Int!
  totalRevenue: Float!
  averageRating: Float!
  lastPurchase: DateTime
}

# Mutation operations
extend type Mutation {
  # Product management
  createProduct(input: CreateProductInput!): DataProduct!
  updateProduct(id: ID!, input: UpdateProductInput!): DataProduct!
  publishProduct(id: ID!): DataProduct!
  unpublishProduct(id: ID!): DataProduct!
  
  # Purchasing
  purchaseAccess(input: PurchaseAccessInput!): Transaction!
  
  # Grant management
  revokeAccess(grantId: ID!): AccessGrant!
  
  # Reviews
  submitReview(input: SubmitReviewInput!): Review!
  
  # Support
  openDispute(transactionId: ID!, reason: String!): Dispute!
}

input CreateProductInput {
  name: String!
  description: String!
  category: ProductCategory!
  schema: JSON!
  sampleData: JSON
  documentation: String
  pricing: PricingInput!
  licenseTerms: String!
}

input UpdateProductInput {
  name: String
  description: String
  documentation: String
  pricing: PricingInput
  licenseTerms: String
}

input PricingInput {
  type: PricingType!
  pricePerAccess: Float
  monthlyPrice: Float
  pricePerRecord: Float
  pricePerGB: Float
  currency: String
}

input PurchaseAccessInput {
  productId: ID!
  quantity: Int
  duration: String! # ISO 8601 duration
  paymentMethod: String!
}

input SubmitReviewInput {
  productId: ID!
  rating: Float!
  comment: String
}
```

### 3. Authorization Patterns for Marketplace

Extend the ABAC pattern for marketplace operations:

```typescript
// services/marketplace-service/src/middleware/abac.ts

import { GraphQLContext } from '../graphql/context.js';
import { opaDecision } from './opa.js';

export interface MarketplaceDecision {
  allow: boolean;
  reason?: string;
  fields: string[];
}

// Check if user can sell products
export async function canSellProducts(
  ctx: GraphQLContext,
): Promise<boolean> {
  const decision = await opaDecision({
    user: { id: ctx.user?.id, role: ctx.user?.role },
    action: 'create_listing',
    resource: { type: 'marketplace_listing' },
  });
  return decision.allow;
}

// Check if user can purchase product
export async function canPurchaseProduct(
  ctx: GraphQLContext,
  productId: string,
): Promise<MarketplaceDecision> {
  const decision = await opaDecision({
    user: { id: ctx.user?.id, role: ctx.user?.role, tenantId: ctx.user?.tenantId },
    action: 'purchase',
    resource: { type: 'data_product', id: productId },
  });
  return decision;
}

// Check if user can access product
export async function canAccessProduct(
  ctx: GraphQLContext,
  grantId: string,
): Promise<MarketplaceDecision> {
  const decision = await opaDecision({
    user: { id: ctx.user?.id, role: ctx.user?.role },
    action: 'access_data',
    resource: { type: 'access_grant', id: grantId },
  });
  return decision;
}

// OPA Policy Example (would live in OPA policy service)
export const MARKETPLACE_OPA_POLICY = `
package intelgraph.authz_marketplace

# Sellers must be verified providers
allow_create_listing {
  input.action == "create_listing"
  data.providers[input.user.id].verified == true
}

# Buyers with subscription can purchase
allow_purchase {
  input.action == "purchase"
  data.users[input.user.id].subscription_active == true
}

# Access based on valid grant
allow_access_data {
  input.action == "access_data"
  grant := data.access_grants[input.resource.id]
  grant.status == "ACTIVE"
  grant.expires_at > now
  grant.buyer_id == input.user.id
}
`;
```

### 4. Database Models for Marketplace

PostgreSQL tables (Prisma schema would be ideal):

```sql
-- Data products catalog
CREATE TABLE data_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  schema JSONB,
  sample_data JSONB,
  documentation TEXT,
  
  -- Quality metrics
  data_quality_score FLOAT CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  trust_score FLOAT CHECK (trust_score >= 0 AND trust_score <= 100),
  
  -- Marketplace status
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  published_at TIMESTAMP,
  
  -- Tenant isolation
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(id, tenant_id)
);

-- Pricing models
CREATE TABLE pricing_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES data_products(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  price_per_access FLOAT,
  monthly_price FLOAT,
  price_per_record FLOAT,
  price_per_gb FLOAT,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Access grants
CREATE TABLE access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES data_products(id),
  
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  access_key VARCHAR(255) UNIQUE NOT NULL,
  access_url VARCHAR(255),
  
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  -- Usage tracking
  records_accessed INT DEFAULT 0,
  usage_bytes FLOAT DEFAULT 0,
  last_accessed TIMESTAMP,
  
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(id, tenant_id)
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES data_products(id),
  access_grant_id UUID REFERENCES access_grants(id),
  
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  quantity INT,
  
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(50),
  payment_ref VARCHAR(255),
  
  -- Revenue split
  platform_fee DECIMAL(12, 2),
  seller_revenue DECIMAL(12, 2),
  
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  UNIQUE(id, tenant_id)
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES data_products(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  
  rating FLOAT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(id, tenant_id)
);

-- Indexes
CREATE INDEX idx_data_products_provider ON data_products(provider_id);
CREATE INDEX idx_data_products_status ON data_products(status);
CREATE INDEX idx_data_products_category ON data_products(category);
CREATE INDEX idx_data_products_tenant ON data_products(tenant_id);

CREATE INDEX idx_access_grants_buyer ON access_grants(buyer_id);
CREATE INDEX idx_access_grants_product ON access_grants(product_id);
CREATE INDEX idx_access_grants_status ON access_grants(status);
CREATE INDEX idx_access_grants_expires ON access_grants(expires_at);
CREATE INDEX idx_access_grants_tenant ON access_grants(tenant_id);

CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_product ON transactions(product_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

### 5. Neo4j Graph Model for Marketplace

```cypher
// Create marketplace entity types
CREATE CONSTRAINT data_asset_id_unique 
FOR (d:DataAsset) REQUIRE d.id IS UNIQUE

CREATE CONSTRAINT data_asset_tenant_isolation 
FOR (d:DataAsset) REQUIRE (d.id, d.tenantId) IS UNIQUE

// Create indexes for marketplace queries
CREATE INDEX data_asset_provider_idx 
FOR (d:DataAsset) ON (d.providerId)

CREATE INDEX data_asset_category_idx 
FOR (d:DataAsset) ON (d.category)

// Relationship types for marketplace graph
CREATE CONSTRAINT relationship_marketplace_unique 
FOR ()-[r:OFFERS]-() REQUIRE r.id IS UNIQUE

// Example: Provider offers data asset
MATCH (provider:User {id: $providerId}), (asset:DataAsset {id: $assetId})
CREATE (provider)-[:OFFERS {
  offeredAt: datetime(),
  status: "ACTIVE",
  price: $price
}]->(asset)

// Example: Buyer accesses data
MATCH (buyer:User {id: $buyerId}), (asset:DataAsset {id: $assetId})
CREATE (buyer)-[:ACCESSES {
  accessedAt: datetime(),
  expiresAt: $expiresAt,
  grantId: $grantId
}]->(asset)

// Example: Query marketplace graph
MATCH (provider:User)-[:OFFERS]->(asset:DataAsset {category: $category})
WHERE asset.status = "PUBLISHED"
RETURN provider, asset
ORDER BY asset.trustScore DESC
LIMIT 10
```

### 6. Redis Patterns for Marketplace

```typescript
// services/marketplace-service/src/cache/marketplace-cache.ts

import { redisClient } from '../db/redis.js';

export class MarketplaceCache {
  // Cache popular products
  async cachePopularProducts(
    products: any[],
    tenantId: string,
    ttlHours: number = 1,
  ): Promise<void> {
    const key = `marketplace:${tenantId}:popular_products`;
    await redisClient.set(key, products, ttlHours * 3600);
  }

  async getPopularProducts(tenantId: string): Promise<any[] | null> {
    const key = `marketplace:${tenantId}:popular_products`;
    return redisClient.get(key);
  }

  // Cache access grant tokens
  async cacheAccessGrant(
    grantId: string,
    accessKey: string,
    expiresAt: Date,
  ): Promise<void> {
    const key = `access_grant:${grantId}`;
    const ttlSeconds = Math.floor(
      (expiresAt.getTime() - Date.now()) / 1000,
    );
    await redisClient.set(key, { grantId, accessKey }, ttlSeconds);
  }

  async getAccessGrant(grantId: string): Promise<any | null> {
    const key = `access_grant:${grantId}`;
    return redisClient.get(key);
  }

  // Pub/Sub for transaction events
  async publishTransactionEvent(
    tenantId: string,
    event: {
      type: 'PURCHASE' | 'REFUND' | 'DISPUTE';
      transactionId: string;
      sellerId: string;
      buyerId: string;
      amount: number;
    },
  ): Promise<void> {
    const channel = `marketplace:${tenantId}:transactions`;
    await redisClient.publish(channel, event);
  }

  // Rate limiting for API calls
  async checkRateLimit(userId: string, action: string): Promise<boolean> {
    const key = `ratelimit:${userId}:${action}`;
    const count = await redisClient.get<number>(key);
    
    if (!count || count < 100) {
      const newCount = (count || 0) + 1;
      await redisClient.set(key, newCount, 3600); // 1 hour window
      return true;
    }
    
    return false;
  }
}
```

### 7. Audit Logging for Marketplace Transactions

```typescript
// services/marketplace-service/src/middleware/auditLog.ts

import { Request } from 'express';
import { logger } from '../utils/logger.js';

export interface MarketplaceAuditEvent {
  action: string;
  userId: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  status: 'success' | 'failure';
  details: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}

export async function auditMarketplaceAction(
  req: Request,
  event: Omit<MarketplaceAuditEvent, 'timestamp' | 'ipAddress'>,
): Promise<void> {
  const auditEvent: MarketplaceAuditEvent = {
    ...event,
    timestamp: new Date(),
    ipAddress: req.ip || 'unknown',
  };

  // Log to structured logger
  logger.info({
    message: `Marketplace: ${event.action}`,
    ...auditEvent,
  });

  // Store in PostgreSQL audit table
  try {
    await postgresPool.query(
      `INSERT INTO marketplace_audit_log 
       (action, user_id, tenant_id, resource_type, resource_id, status, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        event.action,
        event.userId,
        event.tenantId,
        event.resourceType,
        event.resourceId,
        event.status,
        JSON.stringify(event.details),
        req.ip,
      ],
    );
  } catch (error) {
    logger.error({
      message: 'Failed to log marketplace audit event',
      error: error instanceof Error ? error.message : String(error),
      event,
    });
  }

  // Publish to event stream (for real-time monitoring)
  await redisClient.publish(`marketplace:audit:${event.tenantId}`, auditEvent);
}
```

### 8. Resolver Pattern for Marketplace

```typescript
// services/marketplace-service/src/graphql/resolvers/marketplace.ts

import { GraphQLContext } from '../context.js';
import { canSellProducts, canPurchaseProduct } from '../abac.js';
import { auditMarketplaceAction } from '../middleware/auditLog.js';

export const marketplaceResolvers = {
  Query: {
    // Public: discover products
    dataProducts: async (
      _parent: any,
      args: {
        category?: string;
        search?: string;
        limit?: number;
        offset?: number;
      },
      ctx: GraphQLContext,
    ) => {
      const { category, search, limit = 20, offset = 0 } = args;

      const query = `
        SELECT * FROM data_products
        WHERE status = 'PUBLISHED'
          AND tenant_id = $1
          ${category ? 'AND category = $2' : ''}
          ${search ? 'AND (name ILIKE $3 OR description ILIKE $3)' : ''}
        ORDER BY published_at DESC
        LIMIT $${search ? 4 : category ? 3 : 2} OFFSET $${search ? 5 : category ? 4 : 3}
      `;

      const params = [ctx.user?.tenantId];
      if (category) params.push(category);
      if (search) params.push(`%${search}%`);
      params.push(limit, offset);

      const result = await ctx.dataSources.postgres.query(query, params);
      return result.rows;
    },

    // Authenticated: my purchases
    myPurchases: async (
      _parent: any,
      args: { limit?: number; offset?: number },
      ctx: GraphQLContext,
    ) => {
      if (!ctx.user) throw new Error('Authentication required');

      const { limit = 20, offset = 0 } = args;

      const result = await ctx.dataSources.postgres.query(
        `SELECT * FROM access_grants
         WHERE buyer_id = $1 AND tenant_id = $2
         ORDER BY granted_at DESC
         LIMIT $3 OFFSET $4`,
        [ctx.user.id, ctx.user.tenantId, limit, offset],
      );

      return result.rows;
    },

    // Provider dashboard
    myListings: async (_parent: any, _args: any, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error('Authentication required');

      const canSell = await canSellProducts(ctx);
      if (!canSell) throw new Error('Not authorized to sell products');

      const result = await ctx.dataSources.postgres.query(
        `SELECT * FROM data_products
         WHERE provider_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC`,
        [ctx.user.id, ctx.user.tenantId],
      );

      return result.rows;
    },
  },

  Mutation: {
    // Create new product listing
    createProduct: async (
      _parent: any,
      args: { input: any },
      ctx: GraphQLContext,
    ) => {
      if (!ctx.user) throw new Error('Authentication required');

      const canSell = await canSellProducts(ctx);
      if (!canSell) throw new Error('Not authorized to sell products');

      const { input } = args;

      try {
        const result = await ctx.dataSources.postgres.query(
          `INSERT INTO data_products
           (provider_id, name, description, category, schema, sample_data, 
            documentation, tenant_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT')
           RETURNING *`,
          [
            ctx.user.id,
            input.name,
            input.description,
            input.category,
            JSON.stringify(input.schema),
            JSON.stringify(input.sampleData),
            input.documentation,
            ctx.user.tenantId,
          ],
        );

        await auditMarketplaceAction(ctx.req, {
          action: 'CREATE_PRODUCT',
          userId: ctx.user.id,
          tenantId: ctx.user.tenantId,
          resourceType: 'data_product',
          resourceId: result.rows[0].id,
          status: 'success',
          details: { name: input.name, category: input.category },
        });

        return result.rows[0];
      } catch (error) {
        await auditMarketplaceAction(ctx.req, {
          action: 'CREATE_PRODUCT',
          userId: ctx.user.id,
          tenantId: ctx.user.tenantId,
          resourceType: 'data_product',
          resourceId: 'unknown',
          status: 'failure',
          details: {
            error:
              error instanceof Error ? error.message : String(error),
          },
        });
        throw error;
      }
    },

    // Purchase data access
    purchaseAccess: async (
      _parent: any,
      args: { input: any },
      ctx: GraphQLContext,
    ) => {
      if (!ctx.user) throw new Error('Authentication required');

      const { productId, quantity, duration } = args.input;

      // Check authorization
      const authz = await canPurchaseProduct(ctx, productId);
      if (!authz.allow) {
        throw new Error(`Purchase denied: ${authz.reason}`);
      }

      // Get product details
      const productResult = await ctx.dataSources.postgres.query(
        `SELECT * FROM data_products WHERE id = $1`,
        [productId],
      );

      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      const product = productResult.rows[0];

      // Calculate pricing
      const pricing = await ctx.dataSources.postgres.query(
        `SELECT * FROM pricing_models WHERE product_id = $1`,
        [productId],
      );

      const pricingModel = pricing.rows[0];
      const amount = calculateAmount(pricingModel, quantity);

      // Create transaction
      const txResult = await ctx.dataSources.postgres.transaction(
        async (client) => {
          // Create transaction record
          const tx = await client.query(
            `INSERT INTO transactions
             (seller_id, buyer_id, product_id, amount, currency, quantity, 
              status, payment_method, platform_fee, seller_revenue, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $8, $9, $10)
             RETURNING *`,
            [
              product.provider_id,
              ctx.user.id,
              productId,
              amount,
              'USD',
              quantity,
              args.input.paymentMethod,
              amount * 0.1, // 10% platform fee
              amount * 0.9,
              ctx.user.tenantId,
            ],
          );

          // Create access grant
          const expiresAt = new Date();
          expiresAt.setSeconds(
            expiresAt.getSeconds() + parseDuration(duration),
          );

          const grant = await client.query(
            `INSERT INTO access_grants
             (buyer_id, product_id, status, access_key, expires_at, tenant_id)
             VALUES ($1, $2, 'ACTIVE', $3, $4, $5)
             RETURNING *`,
            [
              ctx.user.id,
              productId,
              generateAccessKey(),
              expiresAt,
              ctx.user.tenantId,
            ],
          );

          // Update transaction with grant
          await client.query(
            `UPDATE transactions SET access_grant_id = $1 WHERE id = $2`,
            [grant.rows[0].id, tx.rows[0].id],
          );

          return { transaction: tx.rows[0], grant: grant.rows[0] };
        },
      );

      // Audit
      await auditMarketplaceAction(ctx.req, {
        action: 'PURCHASE_ACCESS',
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
        resourceType: 'data_product',
        resourceId: productId,
        status: 'success',
        details: {
          transactionId: txResult.transaction.id,
          amount,
          grantId: txResult.grant.id,
        },
      });

      // Publish event for real-time updates
      await redisClient.publish(
        `marketplace:${ctx.user.tenantId}:transactions`,
        {
          type: 'PURCHASE',
          transactionId: txResult.transaction.id,
          sellerId: product.provider_id,
          buyerId: ctx.user.id,
          amount,
        },
      );

      return txResult.transaction;
    },
  },
};

function calculateAmount(pricingModel: any, quantity: number): number {
  switch (pricingModel.type) {
    case 'FIXED':
      return pricingModel.price_per_access;
    case 'PAY_PER_USE':
      return pricingModel.price_per_record * quantity;
    case 'SUBSCRIPTION':
      return pricingModel.monthly_price;
    default:
      return 0;
  }
}

function generateAccessKey(): string {
  return `key_${Math.random().toString(36).substring(2, 15)}`;
}

function parseDuration(duration: string): number {
  // Parse ISO 8601 duration (e.g., "P1M" = 1 month, "P30D" = 30 days)
  // Simplified example
  if (duration === 'P1M') return 30 * 24 * 3600;
  if (duration === 'P1Y') return 365 * 24 * 3600;
  return 30 * 24 * 3600; // Default 30 days
}
```

---

## Implementation Checklist

- [ ] Create `services/marketplace-service/` directory
- [ ] Set up Express + Apollo Server boilerplate
- [ ] Implement PostgreSQL tables for marketplace entities
- [ ] Create Neo4j relationships for provider/asset/buyer graph
- [ ] Extend GraphQL schema with marketplace types
- [ ] Implement marketplace resolvers
- [ ] Add ABAC policies for marketplace operations
- [ ] Create payment processor integration (Stripe/PayPal)
- [ ] Implement access token generation and validation
- [ ] Add marketplace audit logging
- [ ] Set up Redis caching for popular products
- [ ] Implement rate limiting for marketplace API
- [ ] Create client UI components for marketplace
- [ ] Add E2E tests for purchase flow
- [ ] Documentation and API examples

---

## References

- See `/home/user/summit/MARKETPLACE_RESEARCH.md` for detailed pattern analysis
- See `/home/user/summit/CLAUDE.md` for project conventions
- Study `/home/user/summit/services/api/src/` for similar patterns
- Study `/home/user/summit/services/catalog-service/` for REST API patterns

