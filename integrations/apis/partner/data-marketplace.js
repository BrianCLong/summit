"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataMarketplace = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
class DataMarketplace extends events_1.EventEmitter {
    config;
    assets = new Map();
    requests = new Map();
    transactions = new Map();
    users = new Map();
    reviews = new Map();
    analytics;
    constructor(config) {
        super();
        this.config = config;
        this.analytics = {
            totalAssets: 0,
            activeAssets: 0,
            totalTransactions: 0,
            totalVolume: 0,
            averagePrice: 0,
            topCategories: [],
            topSellers: [],
            topBuyers: [],
            qualityTrends: [],
            priceTrends: [],
            geographicDistribution: [],
        };
    }
    async listDataAsset(sellerId, asset) {
        const newAsset = {
            ...asset,
            id: crypto_1.default.randomUUID(),
            sellerId,
            status: 'pending',
            listedAt: new Date(),
            lastUpdated: new Date(),
            views: 0,
            downloads: 0,
            rating: 0,
            reviewCount: 0,
        };
        // Validate asset quality if required
        if (this.config.qualityAssurance.sampleValidation) {
            await this.validateAssetQuality(newAsset);
        }
        this.assets.set(newAsset.id, newAsset);
        this.analytics.totalAssets++;
        this.emit('asset_listed', {
            assetId: newAsset.id,
            sellerId,
            title: newAsset.title,
            category: newAsset.category,
            timestamp: new Date(),
        });
        return newAsset;
    }
    async validateAssetQuality(asset) {
        // Implement quality validation logic
        const requiredMetrics = this.config.qualityAssurance.requiredMetrics;
        const currentMetrics = asset.qualityMetrics;
        for (const metric of requiredMetrics) {
            const value = currentMetrics[metric];
            if (value === undefined ||
                value < this.config.qualityAssurance.minimumRating) {
                throw new Error(`Asset does not meet minimum quality requirement for ${metric}`);
            }
        }
        if (this.config.qualityAssurance.thirdPartyValidation) {
            // Trigger third-party validation
            this.emit('third_party_validation_required', {
                assetId: asset.id,
                sellerId: asset.sellerId,
                timestamp: new Date(),
            });
        }
    }
    async approveAsset(assetId, approverId) {
        const asset = this.assets.get(assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }
        asset.status = 'approved';
        asset.lastUpdated = new Date();
        if (asset.qualityMetrics.overall >= this.config.qualityAssurance.minimumRating) {
            asset.status = 'active';
            this.analytics.activeAssets++;
        }
        this.emit('asset_approved', {
            assetId,
            approverId,
            status: asset.status,
            timestamp: new Date(),
        });
        return asset;
    }
    async updateAssetPricing(assetId, sellerId, pricing) {
        const asset = this.assets.get(assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }
        if (asset.sellerId !== sellerId) {
            throw new Error('Unauthorized: Only asset owner can update pricing');
        }
        asset.pricing = pricing;
        asset.lastUpdated = new Date();
        this.emit('pricing_updated', {
            assetId,
            sellerId,
            newPricing: pricing,
            timestamp: new Date(),
        });
        return asset;
    }
    async searchAssets(criteria) {
        let results = Array.from(this.assets.values()).filter((asset) => asset.status === 'active');
        if (criteria.category) {
            results = results.filter((asset) => asset.category === criteria.category);
        }
        if (criteria.dataType) {
            results = results.filter((asset) => asset.dataType === criteria.dataType);
        }
        if (criteria.format) {
            results = results.filter((asset) => criteria.format.some((format) => asset.format.includes(format)));
        }
        if (criteria.geography) {
            results = results.filter((asset) => criteria.geography.some((geo) => asset.geography.includes(geo)));
        }
        if (criteria.priceRange) {
            results = results.filter((asset) => {
                const price = asset.pricing.basePrice;
                return (price >= criteria.priceRange.min && price <= criteria.priceRange.max);
            });
        }
        if (criteria.qualityScore) {
            results = results.filter((asset) => asset.qualityMetrics.overall >= criteria.qualityScore);
        }
        if (criteria.updateFrequency) {
            results = results.filter((asset) => asset.updateFrequency === criteria.updateFrequency);
        }
        if (criteria.tags) {
            results = results.filter((asset) => criteria.tags.some((tag) => asset.tags.includes(tag)));
        }
        if (criteria.text) {
            const searchText = criteria.text.toLowerCase();
            results = results.filter((asset) => asset.title.toLowerCase().includes(searchText) ||
                asset.description.toLowerCase().includes(searchText) ||
                asset.tags.some((tag) => tag.toLowerCase().includes(searchText)));
        }
        // Increment view counts
        results.forEach((asset) => asset.views++);
        this.emit('assets_searched', {
            criteria,
            resultCount: results.length,
            timestamp: new Date(),
        });
        return results.sort((a, b) => b.rating - a.rating);
    }
    async submitDataRequest(buyerId, request) {
        const newRequest = {
            ...request,
            id: crypto_1.default.randomUUID(),
            buyerId,
            status: 'open',
            createdAt: new Date(),
            responses: [],
        };
        this.requests.set(newRequest.id, newRequest);
        // Notify potential sellers
        this.notifyPotentialSellers(newRequest);
        this.emit('data_request_submitted', {
            requestId: newRequest.id,
            buyerId,
            title: newRequest.title,
            category: newRequest.category,
            timestamp: new Date(),
        });
        return newRequest;
    }
    async notifyPotentialSellers(request) {
        // Find sellers with relevant assets
        const relevantSellers = new Set();
        for (const asset of this.assets.values()) {
            if (asset.category === request.category && asset.status === 'active') {
                relevantSellers.add(asset.sellerId);
            }
        }
        relevantSellers.forEach((sellerId) => {
            this.emit('seller_notification', {
                sellerId,
                requestId: request.id,
                category: request.category,
                budget: request.budget,
                timestamp: new Date(),
            });
        });
    }
    async respondToRequest(requestId, sellerId, response) {
        const request = this.requests.get(requestId);
        if (!request) {
            throw new Error('Request not found');
        }
        if (request.status !== 'open') {
            throw new Error('Request is no longer accepting responses');
        }
        const newResponse = {
            ...response,
            id: crypto_1.default.randomUUID(),
            sellerId,
            status: 'pending',
            submittedAt: new Date(),
        };
        request.responses.push(newResponse);
        this.emit('request_response_submitted', {
            requestId,
            responseId: newResponse.id,
            sellerId,
            timestamp: new Date(),
        });
        return newResponse;
    }
    async acceptRequestResponse(requestId, responseId, buyerId) {
        const request = this.requests.get(requestId);
        if (!request) {
            throw new Error('Request not found');
        }
        if (request.buyerId !== buyerId) {
            throw new Error('Unauthorized: Only request owner can accept responses');
        }
        const response = request.responses.find((r) => r.id === responseId);
        if (!response) {
            throw new Error('Response not found');
        }
        // Create transaction
        const transaction = await this.createTransaction({
            requestId,
            responseId,
            buyerId,
            sellerId: response.sellerId,
            type: 'custom',
            amount: response.pricing.basePrice,
            currency: response.pricing.currency,
            paymentMethod: 'default',
            escrowEnabled: this.config.escrowEnabled,
            contract: this.createContractFromResponse(response),
            delivery: {
                method: 'api',
                accessCount: 0,
                acknowledged: false,
            },
        });
        request.status = 'fulfilled';
        request.selectedResponse = responseId;
        response.status = 'accepted';
        // Reject other responses
        request.responses.forEach((r) => {
            if (r.id !== responseId && r.status === 'pending') {
                r.status = 'rejected';
            }
        });
        this.emit('request_response_accepted', {
            requestId,
            responseId,
            transactionId: transaction.id,
            timestamp: new Date(),
        });
        return transaction;
    }
    createContractFromResponse(response) {
        return {
            price: response.pricing.basePrice,
            currency: response.pricing.currency,
            deliveryMethod: 'api',
            deliveryTimeline: `${response.deliveryTime} days`,
            qualityGuarantees: response.qualityGuarantees,
            supportLevel: 'standard',
            warrantiesCovered: ['data-quality', 'delivery-timeline'],
            refundPolicy: 'standard',
            disputeResolution: 'mediation',
            customClauses: response.customTerms ? [response.customTerms] : [],
        };
    }
    async purchaseAsset(assetId, buyerId, options) {
        const asset = this.assets.get(assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }
        if (asset.status !== 'active') {
            throw new Error('Asset is not available for purchase');
        }
        const transaction = await this.createTransaction({
            assetId,
            buyerId,
            sellerId: asset.sellerId,
            type: 'purchase',
            amount: asset.pricing.basePrice,
            currency: asset.pricing.currency,
            paymentMethod: options?.paymentMethod || 'default',
            escrowEnabled: this.config.escrowEnabled,
            contract: {
                price: asset.pricing.basePrice,
                currency: asset.pricing.currency,
                deliveryMethod: options?.deliveryMethod || 'download',
                deliveryTimeline: 'immediate',
                qualityGuarantees: [`Quality score: ${asset.qualityMetrics.overall}`],
                supportLevel: 'standard',
                warrantiesCovered: ['data-quality'],
                refundPolicy: 'standard',
                disputeResolution: 'mediation',
                customClauses: [],
            },
            delivery: {
                method: options?.deliveryMethod || 'download',
                accessCount: 0,
                acknowledged: false,
            },
        });
        asset.downloads++;
        this.emit('asset_purchased', {
            assetId,
            transactionId: transaction.id,
            buyerId,
            sellerId: asset.sellerId,
            amount: transaction.amount,
            timestamp: new Date(),
        });
        return transaction;
    }
    async createTransaction(data) {
        const transaction = {
            ...data,
            id: crypto_1.default.randomUUID(),
            status: 'pending',
            createdAt: new Date(),
            metadata: {},
        };
        this.transactions.set(transaction.id, transaction);
        this.analytics.totalTransactions++;
        this.emit('transaction_created', {
            transactionId: transaction.id,
            buyerId: transaction.buyerId,
            sellerId: transaction.sellerId,
            amount: transaction.amount,
            timestamp: new Date(),
        });
        // Start payment processing
        this.processPayment(transaction);
        return transaction;
    }
    async processPayment(transaction) {
        try {
            transaction.status = 'processing';
            // Simulate payment processing
            await new Promise((resolve) => setTimeout(resolve, 2000));
            transaction.status = 'completed';
            transaction.completedAt = new Date();
            this.analytics.totalVolume += transaction.amount;
            this.analytics.averagePrice =
                this.analytics.totalVolume / this.analytics.totalTransactions;
            // Setup delivery
            await this.setupDelivery(transaction);
            this.emit('payment_completed', {
                transactionId: transaction.id,
                amount: transaction.amount,
                timestamp: new Date(),
            });
        }
        catch (error) {
            transaction.status = 'failed';
            this.emit('payment_failed', {
                transactionId: transaction.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            });
        }
    }
    async setupDelivery(transaction) {
        const delivery = transaction.delivery;
        switch (delivery.method) {
            case 'download':
                delivery.downloadUrls = [
                    `https://marketplace.intelgraph.com/download/${transaction.id}`,
                ];
                delivery.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
                delivery.maxAccess = 10;
                break;
            case 'api':
                delivery.endpoint = `https://api.intelgraph.com/marketplace/data/${transaction.id}`;
                delivery.credentials = {
                    apiKey: crypto_1.default.randomUUID(),
                    secret: crypto_1.default.randomUUID(),
                };
                delivery.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                break;
            case 'streaming':
                delivery.endpoint = `wss://stream.intelgraph.com/marketplace/${transaction.id}`;
                delivery.credentials = {
                    token: crypto_1.default.randomUUID(),
                };
                break;
        }
        delivery.deliveredAt = new Date();
        this.emit('delivery_setup', {
            transactionId: transaction.id,
            method: delivery.method,
            endpoint: delivery.endpoint,
            timestamp: new Date(),
        });
    }
    async submitReview(transactionId, reviewerId, review) {
        const transaction = this.transactions.get(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        if (transaction.buyerId !== reviewerId) {
            throw new Error('Only the buyer can review the transaction');
        }
        const newReview = {
            id: crypto_1.default.randomUUID(),
            transactionId,
            reviewerId,
            rating: review.rating,
            title: review.title,
            comment: review.comment,
            aspects: review.aspects,
            createdAt: new Date(),
            helpful: 0,
            verified: true,
        };
        this.reviews.set(newReview.id, newReview);
        // Update asset rating if applicable
        if (transaction.assetId) {
            await this.updateAssetRating(transaction.assetId);
        }
        this.emit('review_submitted', {
            reviewId: newReview.id,
            transactionId,
            rating: review.rating,
            timestamp: new Date(),
        });
        return newReview;
    }
    async updateAssetRating(assetId) {
        const asset = this.assets.get(assetId);
        if (!asset)
            return;
        const assetReviews = Array.from(this.reviews.values()).filter((review) => {
            const transaction = this.transactions.get(review.transactionId);
            return transaction?.assetId === assetId;
        });
        if (assetReviews.length > 0) {
            const totalRating = assetReviews.reduce((sum, review) => sum + review.rating, 0);
            asset.rating = totalRating / assetReviews.length;
            asset.reviewCount = assetReviews.length;
        }
    }
    async getAsset(assetId) {
        const asset = this.assets.get(assetId);
        if (asset) {
            asset.views++;
        }
        return asset;
    }
    async getRequest(requestId) {
        return this.requests.get(requestId);
    }
    async getTransaction(transactionId) {
        return this.transactions.get(transactionId);
    }
    async listUserAssets(sellerId) {
        return Array.from(this.assets.values()).filter((asset) => asset.sellerId === sellerId);
    }
    async listUserTransactions(userId) {
        return Array.from(this.transactions.values()).filter((transaction) => transaction.buyerId === userId || transaction.sellerId === userId);
    }
    async getMarketplaceAnalytics() {
        this.updateAnalytics();
        return { ...this.analytics };
    }
    updateAnalytics() {
        const assets = Array.from(this.assets.values());
        const transactions = Array.from(this.transactions.values());
        this.analytics.totalAssets = assets.length;
        this.analytics.activeAssets = assets.filter((a) => a.status === 'active').length;
        // Update category analytics
        const categoryStats = new Map();
        assets.forEach((asset) => {
            const current = categoryStats.get(asset.category) || {
                count: 0,
                volume: 0,
            };
            current.count++;
            categoryStats.set(asset.category, current);
        });
        transactions.forEach((transaction) => {
            if (transaction.assetId) {
                const asset = this.assets.get(transaction.assetId);
                if (asset) {
                    const current = categoryStats.get(asset.category) || {
                        count: 0,
                        volume: 0,
                    };
                    current.volume += transaction.amount;
                    categoryStats.set(asset.category, current);
                }
            }
        });
        this.analytics.topCategories = Array.from(categoryStats.entries())
            .map(([category, stats]) => ({ category, ...stats }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 10);
        // Update seller analytics
        const sellerStats = new Map();
        transactions.forEach((transaction) => {
            const current = sellerStats.get(transaction.sellerId) || {
                transactions: 0,
                volume: 0,
            };
            current.transactions++;
            current.volume += transaction.amount;
            sellerStats.set(transaction.sellerId, current);
        });
        this.analytics.topSellers = Array.from(sellerStats.entries())
            .map(([sellerId, stats]) => ({ sellerId, ...stats }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 10);
        // Update buyer analytics
        const buyerStats = new Map();
        transactions.forEach((transaction) => {
            const current = buyerStats.get(transaction.buyerId) || {
                transactions: 0,
                volume: 0,
            };
            current.transactions++;
            current.volume += transaction.amount;
            buyerStats.set(transaction.buyerId, current);
        });
        this.analytics.topBuyers = Array.from(buyerStats.entries())
            .map(([buyerId, stats]) => ({ buyerId, ...stats }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 10);
    }
}
exports.DataMarketplace = DataMarketplace;
