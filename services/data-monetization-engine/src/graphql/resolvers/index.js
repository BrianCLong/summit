"use strict";
/**
 * GraphQL Resolvers for Data Monetization Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const uuid_1 = require("uuid");
const data_monetization_types_1 = require("@intelgraph/data-monetization-types");
const ComplianceService_js_1 = require("../../services/ComplianceService.js");
const ContractService_js_1 = require("../../services/ContractService.js");
const ValuationService_js_1 = require("../../services/ValuationService.js");
const AssetDiscoveryService_js_1 = require("../../services/AssetDiscoveryService.js");
const MarketplaceService_js_1 = require("../../services/MarketplaceService.js");
const logger_js_1 = require("../../utils/logger.js");
// In-memory stores (would be database in production)
const assets = new Map();
const products = new Map();
const contracts = new Map();
const complianceChecks = new Map();
const valuations = new Map();
exports.resolvers = {
    Query: {
        // Data Assets
        dataAsset: (_, { id }) => assets.get(id) || null,
        dataAssets: (_, { limit = 20, offset = 0 }) => Array.from(assets.values()).slice(offset, offset + limit),
        // Compliance
        complianceCheck: (_, { id }) => complianceChecks.get(id) || null,
        assetComplianceChecks: (_, { assetId }) => Array.from(complianceChecks.values()).filter((c) => c.assetId === assetId),
        supportedFrameworks: () => [...data_monetization_types_1.complianceFrameworks],
        // Products
        dataProduct: (_, { id }) => products.get(id) || null,
        dataProducts: (_, { limit = 20, offset = 0 }) => Array.from(products.values()).slice(offset, offset + limit),
        // Contracts
        contract: (_, { id }) => contracts.get(id) || null,
        contracts: (_, { status, limit = 20, offset = 0 }) => {
            let result = Array.from(contracts.values());
            if (status)
                result = result.filter((c) => c.status === status);
            return result.slice(offset, offset + limit);
        },
        // Marketplace
        listing: (_, { id }) => MarketplaceService_js_1.marketplaceService.searchListings({}).then(r => r.listings.find(l => l.id === id)),
        searchListings: async (_, { input }) => MarketplaceService_js_1.marketplaceService.searchListings(input),
        featuredListings: async (_, { limit = 10 }) => MarketplaceService_js_1.marketplaceService.getFeaturedListings(limit),
        topListings: async (_, { metric, limit = 10 }) => MarketplaceService_js_1.marketplaceService.getTopListings(metric, limit),
        // Valuations
        valuation: (_, { assetId }) => Array.from(valuations.values()).find((v) => v.assetId === assetId) || null,
        // Revenue
        revenueReport: async (_, { startDate, endDate }, context) => MarketplaceService_js_1.marketplaceService.generateRevenueReport(context.tenantId || 'default', startDate, endDate),
    },
    Mutation: {
        // Data Assets
        createDataAsset: (_, { input }, context) => {
            const asset = {
                id: (0, uuid_1.v4)(),
                ...input,
                tags: input.tags || [],
                metadata: input.metadata || {},
                owner: context.user?.id || 'system',
                tenantId: context.tenantId || 'default',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            assets.set(asset.id, asset);
            logger_js_1.logger.info({ assetId: asset.id }, 'Created data asset');
            return asset;
        },
        updateDataAsset: (_, { id, input }) => {
            const asset = assets.get(id);
            if (!asset)
                throw new Error('Asset not found');
            const updated = { ...asset, ...input, updatedAt: new Date().toISOString() };
            assets.set(id, updated);
            return updated;
        },
        deleteDataAsset: (_, { id }) => {
            const deleted = assets.delete(id);
            return deleted;
        },
        discoverAssets: async (_, { sources }, context) => {
            const discovered = await AssetDiscoveryService_js_1.assetDiscoveryService.discoverAssets(sources, context.tenantId || 'default', context.user?.id || 'system');
            for (const asset of discovered) {
                assets.set(asset.id, asset);
            }
            return discovered;
        },
        // Compliance
        runComplianceCheck: async (_, { input }) => {
            const asset = assets.get(input.assetId);
            if (!asset)
                throw new Error('Asset not found');
            const checks = await ComplianceService_js_1.complianceService.checkCompliance(asset, input.frameworks, input.deepScan || false);
            for (const check of checks) {
                complianceChecks.set(check.id, check);
            }
            return checks;
        },
        // Products
        createDataProduct: (_, { input }, context) => {
            const product = {
                id: (0, uuid_1.v4)(),
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
            logger_js_1.logger.info({ productId: product.id }, 'Created data product');
            return product;
        },
        updateDataProduct: (_, { id, input }) => {
            const product = products.get(id);
            if (!product)
                throw new Error('Product not found');
            const updated = { ...product, ...input, updatedAt: new Date().toISOString() };
            products.set(id, updated);
            return updated;
        },
        publishDataProduct: (_, { id }) => {
            const product = products.get(id);
            if (!product)
                throw new Error('Product not found');
            product.status = 'PUBLISHED';
            product.publishedAt = new Date().toISOString();
            product.updatedAt = new Date().toISOString();
            return product;
        },
        // Contracts
        generateContract: async (_, { input }, context) => {
            const product = products.get(input.productId);
            if (!product)
                throw new Error('Product not found');
            const contract = await ContractService_js_1.contractService.generateContract({ ...input, tenantId: context.tenantId || 'default' }, product);
            contracts.set(contract.id, contract);
            // Generate document text
            contract.documentText = ContractService_js_1.contractService.generateContractDocument(contract, product);
            logger_js_1.logger.info({ contractId: contract.id }, 'Generated contract');
            return contract;
        },
        signContract: async (_, { contractId, party, signedBy }) => {
            const contract = contracts.get(contractId);
            if (!contract)
                throw new Error('Contract not found');
            const signed = await ContractService_js_1.contractService.signContract(contract, party, signedBy);
            contracts.set(contractId, signed);
            return signed;
        },
        // Marketplace
        createListing: async (_, { input }, context) => {
            const product = products.get(input.productId);
            if (!product)
                throw new Error('Product not found');
            return MarketplaceService_js_1.marketplaceService.createListing(product, context.tenantId || 'default', {
                headline: input.headline,
                highlights: input.highlights,
                visibility: input.visibility,
            });
        },
        publishListing: async (_, { id }) => MarketplaceService_js_1.marketplaceService.publishListing(id),
        recordListingView: async (_, { id }) => {
            await MarketplaceService_js_1.marketplaceService.recordView(id);
            return true;
        },
        recordListingInquiry: async (_, { id }) => {
            await MarketplaceService_js_1.marketplaceService.recordInquiry(id);
            return true;
        },
        purchaseProduct: async (_, { listingId, contractId }, context) => {
            const contract = contracts.get(contractId);
            if (!contract)
                throw new Error('Contract not found');
            return MarketplaceService_js_1.marketplaceService.processPurchase(listingId, contractId, contract.productId, contract.pricing.totalValueCents, contract.providerId, contract.consumerId, context.tenantId || 'default');
        },
        rateListing: async (_, { id, rating }) => {
            await MarketplaceService_js_1.marketplaceService.addRating(id, rating);
            const result = await MarketplaceService_js_1.marketplaceService.searchListings({});
            return result.listings.find((l) => l.id === id);
        },
        // Valuations
        valuateAsset: async (_, { assetId }) => {
            const asset = assets.get(assetId);
            if (!asset)
                throw new Error('Asset not found');
            const valuation = await ValuationService_js_1.valuationService.valuateAsset(asset);
            valuations.set(valuation.id, valuation);
            return valuation;
        },
    },
    // Field resolvers
    DataAsset: {
        complianceChecks: (asset) => Array.from(complianceChecks.values()).filter((c) => c.assetId === asset.id),
        valuation: (asset) => Array.from(valuations.values()).find((v) => v.assetId === asset.id),
    },
    DataContract: {
        documentText: (contract) => {
            const product = products.get(contract.productId);
            if (!product)
                return null;
            return ContractService_js_1.contractService.generateContractDocument(contract, product);
        },
    },
};
