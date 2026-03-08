"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.explanationBookmarkService = exports.ExplanationBookmarkService = void 0;
const CacheService_js_1 = require("./CacheService.js");
const logger_js_1 = require("../config/logger.js");
const crypto_1 = __importDefault(require("crypto"));
class ExplanationBookmarkService {
    static instance;
    PREFIX = 'bookmark:';
    TTL = 30 * 24 * 60 * 60; // 30 days
    constructor() { }
    static getInstance() {
        if (!ExplanationBookmarkService.instance) {
            ExplanationBookmarkService.instance = new ExplanationBookmarkService();
        }
        return ExplanationBookmarkService.instance;
    }
    /**
     * Save an explanation as a bookmark.
     * Uses a deterministic hash of the content as the ID.
     */
    async saveBookmark(explanation) {
        try {
            // Create a deterministic hash of the explanation content
            const contentString = JSON.stringify(explanation);
            const id = crypto_1.default.createHash('sha256').update(contentString).digest('hex').substring(0, 16);
            await CacheService_js_1.cacheService.set(this.PREFIX + id, explanation, this.TTL);
            logger_js_1.logger.info({ id }, 'Explanation bookmark saved');
            return {
                id,
                url: `/investigate?explanation=${id}`
            };
        }
        catch (error) {
            logger_js_1.logger.error({ error }, 'Failed to save bookmark');
            throw error;
        }
    }
    /**
     * Retrieve a bookmarked explanation.
     */
    async getBookmark(id) {
        try {
            const explanation = await CacheService_js_1.cacheService.get(this.PREFIX + id);
            return explanation;
        }
        catch (error) {
            logger_js_1.logger.error({ error, id }, 'Failed to get bookmark');
            throw error;
        }
    }
}
exports.ExplanationBookmarkService = ExplanationBookmarkService;
exports.explanationBookmarkService = ExplanationBookmarkService.getInstance();
