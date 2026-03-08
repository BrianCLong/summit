"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketplaceService = exports.MarketplaceService = void 0;
const logger_js_1 = require("../config/logger.js");
const crypto_1 = require("crypto");
/**
 * Service for the Summit Marketplace (Task #119).
 * Managed certified exchange for connectors, agents, and runbooks.
 */
class MarketplaceService {
    static instance;
    registry = [
        {
            id: 'conn-dark-web-scout',
            name: 'DarkWeb Scout',
            type: 'connector',
            provider: 'Summit-Core',
            version: '2.1.0',
            certified: true,
            pqcSignature: 'pqc-sig:marketplace-01'
        },
        {
            id: 'agent-money-trail',
            name: 'MoneyTrail AI',
            type: 'agent',
            provider: 'FinCen-Partner',
            version: '1.0.4',
            certified: true,
            pqcSignature: 'pqc-sig:marketplace-02'
        }
    ];
    constructor() { }
    static getInstance() {
        if (!MarketplaceService.instance) {
            MarketplaceService.instance = new MarketplaceService();
        }
        return MarketplaceService.instance;
    }
    /**
     * Lists available certified assets in the marketplace.
     */
    async listAssets(filter) {
        logger_js_1.logger.info('Marketplace: Listing certified assets');
        return this.registry.filter(asset => {
            if (filter?.type && asset.type !== filter.type)
                return false;
            if (filter?.certified !== undefined && asset.certified !== filter.certified)
                return false;
            return true;
        });
    }
    /**
     * Publishes a new asset to the marketplace.
     */
    async publishAsset(asset) {
        logger_js_1.logger.info({ name: asset.name }, 'Marketplace: Publishing new asset');
        // In a real system, this would trigger a certification workflow (human + AI audit)
        const newAsset = {
            ...asset,
            id: (0, crypto_1.randomUUID)(),
            certified: true, // Auto-certified for Phase 8 simulation
            pqcSignature: `pqc-sig:asset-${(0, crypto_1.randomUUID)().substring(0, 8)}`
        };
        this.registry.push(newAsset);
        return newAsset;
    }
}
exports.MarketplaceService = MarketplaceService;
exports.marketplaceService = MarketplaceService.getInstance();
