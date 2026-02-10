import { cacheService } from './CacheService';
import { logger } from '../config/logger';
import crypto from 'crypto';

export interface BookmarkResult {
    id: string;
    url: string;
}

export class ExplanationBookmarkService {
    private static instance: ExplanationBookmarkService;
    private readonly PREFIX = 'bookmark:';
    private readonly TTL = 30 * 24 * 60 * 60; // 30 days

    private constructor() {}

    public static getInstance(): ExplanationBookmarkService {
        if (!ExplanationBookmarkService.instance) {
            ExplanationBookmarkService.instance = new ExplanationBookmarkService();
        }
        return ExplanationBookmarkService.instance;
    }

    /**
     * Save an explanation as a bookmark.
     * Uses a deterministic hash of the content as the ID.
     */
    public async saveBookmark(explanation: any): Promise<BookmarkResult> {
        try {
            // Create a deterministic hash of the explanation content
            const contentString = JSON.stringify(explanation);
            const id = crypto.createHash('sha256').update(contentString).digest('hex').substring(0, 16);

            await cacheService.set(this.PREFIX + id, explanation, this.TTL);

            logger.info({ id }, 'Explanation bookmark saved');

            return {
                id,
                url: `/investigate?explanation=${id}`
            };
        } catch (error: any) {
            logger.error({ error }, 'Failed to save bookmark');
            throw error;
        }
    }

    /**
     * Retrieve a bookmarked explanation.
     */
    public async getBookmark(id: string): Promise<any | null> {
        try {
            const explanation = await cacheService.get(this.PREFIX + id);
            return explanation;
        } catch (error: any) {
            logger.error({ error, id }, 'Failed to get bookmark');
            throw error;
        }
    }
}

export const explanationBookmarkService = ExplanationBookmarkService.getInstance();
