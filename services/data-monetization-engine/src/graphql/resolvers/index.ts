/**
 * GraphQL Resolvers for Data Monetization Engine
 */

import { v4 as uuid } from 'uuid';
import {
  DataAsset,
  DataProduct,
  DataContract,
  complianceFrameworks,
} from '@intelgraph/data-monetization-types';
import { complianceService } from '../../services/ComplianceService.js';
import { contractService } from '../../services/ContractService.js';
import { valuationService } from '../../services/ValuationService.js';
import { assetDiscoveryService } from '../../services/AssetDiscoveryService.js';
import { marketplaceService } from '../../services/MarketplaceService.js';
import { logger } from '../../utils/logger.js';

// In-memory stores (would be database in production)
const assets = new Map<string, DataAsset>();
const products = new Map<string, DataProduct>();
const contracts = new Map<string, DataContract>();
const complianceChecks = new Map<string, any>();
const valuations = new Map<string, any>();

export const resolvers = {
  Query: {
    // Data Assets
    dataAsset: (_: unknown, { id }: { id: string }) => assets.get(id) || null,

    dataAssets: (_: unknown, { limit = 20, offset = 0 }: { limit?: number; offset?: number }) =>
      Array.from(assets.values()).slice(offset, offset + limit),

    // Compliance
    complianceCheck: (_: unknown, { id }: { id: string }) => complianceChecks.get(id) || null,

    assetComplianceChecks: (_: unknown, { assetId }: { assetId: string }) =>
      Array.from(complianceChecks.values()).filter((c) => c.assetId === assetId),

    supportedFrameworks: () => [...complianceFrameworks],

    // Products
    dataProduct: (_: unknown, { id }: { id: string }) => products.get(id) || null,

    dataProducts: (_: unknown, { limit = 20, offset = 0 }: { limit?: number; offset?: number }) =>
      Array.from(products.values()).slice(offset, offset + limit),

    // Contracts
    contract: (_: unknown, { id }: { id: string }) => contracts.get(id) || null,

    contracts: (
      _: unknown,
      { status, limit = 20, offset = 0 }: { status?: string; limit?: number; offset?: number },
    ) => {
      let result = Array.from(contracts.values());
      if (status) result = result.filter((c) => c.status === status);
      return result.slice(offset, offset + limit);
    },

    // Marketplace
    listing: (_: unknown, { id }: { id: string }) => marketplaceService.searchListings({}).then(r => r.listings.find(l => l.id === id)),

    searchListings: async (_: unknown, { input }: { input: any }) =>
      marketplaceService.searchListings(input),

    featuredListings: async (_: unknown, { limit = 10 }: { limit?: number }) =>
      marketplaceService.getFeaturedListings(limit),

    topListings: async (
      _: unknown,
      { metric, limit = 10 }: { metric: 'views' | 'purchases' | 'revenue'; limit?: number },
    ) => marketplaceService.getTopListings(metric, limit),

    // Valuations
    valuation: (_: unknown, { assetId }: { assetId: string }) =>
      Array.from(valuations.values()).find((v) => v.assetId === assetId) || null,

    // Revenue
    revenueReport: async (
      _: unknown,
      { startDate, endDate }: { startDate: string; endDate: string },
      context: any,
    ) => marketplaceService.generateRevenueReport(context.tenantId || 'default', startDate, endDate),
  },

  Mutation: {
    // Data Assets
    createDataAsset: (_: unknown, { input }: { input: any }, context: any) => {
      const asset: DataAsset = {
        id: uuid(),
        ...input,
        tags: input.tags || [],
        metadata: input.metadata || {},
        owner: context.user?.id || 'system',
        tenantId: context.tenantId || 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assets.set(asset.id, asset);
      logger.info({ assetId: asset.id }, 'Created data asset');
      return asset;
    },

    updateDataAsset: (_: unknown, { id, input }: { id: string; input: any }) => {
      const asset = assets.get(id);
      if (!asset) throw new Error('Asset not found');
      const updated = { ...asset, ...input, updatedAt: new Date().toISOString() };
      assets.set(id, updated);
      return updated;
    },

    deleteDataAsset: (_: unknown, { id }: { id: string }) => {
      const deleted = assets.delete(id);
      return deleted;
    },

    discoverAssets: async (_: unknown, { sources }: { sources: any[] }, context: any) => {
      const discovered = await assetDiscoveryService.discoverAssets(
        sources,
        context.tenantId || 'default',
        context.user?.id || 'system',
      );
      for (const asset of discovered) {
        assets.set(asset.id, asset);
      }
      return discovered;
    },

    // Compliance
    runComplianceCheck: async (_: unknown, { input }: { input: any }) => {
      const asset = assets.get(input.assetId);
      if (!asset) throw new Error('Asset not found');

      const checks = await complianceService.checkCompliance(
        asset,
        input.frameworks,
        input.deepScan || false,
      );

      for (const check of checks) {
        complianceChecks.set(check.id, check);
      }

      return checks;
    },

    // Products
    createDataProduct: (_: unknown, { input }: { input: any }, context: any) => {
      const product: DataProduct = {
        id: uuid(),
        ...input,
        version: '1.0.0',
        complianceCertifications: input.complianceCertifications || [],
        targetAudiences: input.targetAudiences || [],
        useCases: input.useCases || [],
        status: 'DRAFT',
        owner: context.user?.id || 'system',
        tenantId: context.tenantId || 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      products.set(product.id, product);
      logger.info({ productId: product.id }, 'Created data product');
      return product;
    },

    updateDataProduct: (_: unknown, { id, input }: { id: string; input: any }) => {
      const product = products.get(id);
      if (!product) throw new Error('Product not found');
      const updated = { ...product, ...input, updatedAt: new Date().toISOString() };
      products.set(id, updated);
      return updated;
    },

    publishDataProduct: (_: unknown, { id }: { id: string }) => {
      const product = products.get(id);
      if (!product) throw new Error('Product not found');
      product.status = 'PUBLISHED';
      product.publishedAt = new Date().toISOString();
      product.updatedAt = new Date().toISOString();
      return product;
    },

    // Contracts
    generateContract: async (_: unknown, { input }: { input: any }, context: any) => {
      const product = products.get(input.productId);
      if (!product) throw new Error('Product not found');

      const contract = await contractService.generateContract(
        { ...input, tenantId: context.tenantId || 'default' },
        product,
      );
      contracts.set(contract.id, contract);

      // Generate document text
      (contract as any).documentText = contractService.generateContractDocument(contract, product);

      logger.info({ contractId: contract.id }, 'Generated contract');
      return contract;
    },

    signContract: async (
      _: unknown,
      { contractId, party, signedBy }: { contractId: string; party: string; signedBy: string },
    ) => {
      const contract = contracts.get(contractId);
      if (!contract) throw new Error('Contract not found');

      const signed = await contractService.signContract(contract, party, signedBy);
      contracts.set(contractId, signed);
      return signed;
    },

    // Marketplace
    createListing: async (_: unknown, { input }: { input: any }, context: any) => {
      const product = products.get(input.productId);
      if (!product) throw new Error('Product not found');

      return marketplaceService.createListing(product, context.tenantId || 'default', {
        headline: input.headline,
        highlights: input.highlights,
        visibility: input.visibility,
      });
    },

    publishListing: async (_: unknown, { id }: { id: string }) =>
      marketplaceService.publishListing(id),

    recordListingView: async (_: unknown, { id }: { id: string }) => {
      await marketplaceService.recordView(id);
      return true;
    },

    recordListingInquiry: async (_: unknown, { id }: { id: string }) => {
      await marketplaceService.recordInquiry(id);
      return true;
    },

    purchaseProduct: async (
      _: unknown,
      { listingId, contractId }: { listingId: string; contractId: string },
      context: any,
    ) => {
      const contract = contracts.get(contractId);
      if (!contract) throw new Error('Contract not found');

      return marketplaceService.processPurchase(
        listingId,
        contractId,
        contract.productId,
        contract.pricing.totalValueCents,
        contract.providerId,
        contract.consumerId,
        context.tenantId || 'default',
      );
    },

    rateListing: async (_: unknown, { id, rating }: { id: string; rating: number }) => {
      await marketplaceService.addRating(id, rating);
      const result = await marketplaceService.searchListings({});
      return result.listings.find((l) => l.id === id);
    },

    // Valuations
    valuateAsset: async (_: unknown, { assetId }: { assetId: string }) => {
      const asset = assets.get(assetId);
      if (!asset) throw new Error('Asset not found');

      const valuation = await valuationService.valuateAsset(asset);
      valuations.set(valuation.id, valuation);
      return valuation;
    },
  },

  // Field resolvers
  DataAsset: {
    complianceChecks: (asset: DataAsset) =>
      Array.from(complianceChecks.values()).filter((c) => c.assetId === asset.id),

    valuation: (asset: DataAsset) =>
      Array.from(valuations.values()).find((v) => v.assetId === asset.id),
  },

  DataContract: {
    documentText: (contract: DataContract) => {
      const product = products.get(contract.productId);
      if (!product) return null;
      return contractService.generateContractDocument(contract, product);
    },
  },
};
