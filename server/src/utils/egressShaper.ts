
/**
 * Egress Shaper Utility
 *
 * Handles progressive disclosure and chunking for large payloads to manage egress costs and improve UX.
 */

export interface EgressShapingConfig {
    maxInitialPayloadSizeMb: number;
    chunkSizeMb: number;
}

const DEFAULT_CONFIG: EgressShapingConfig = {
    maxInitialPayloadSizeMb: 5,
    chunkSizeMb: 1
};

export class EgressShaper {
    constructor(private config: EgressShapingConfig = DEFAULT_CONFIG) {}

    /**
     * shapes the response data. If it exceeds the maxInitialPayloadSizeMb,
     * it truncates the data and returns a "continuation token" or a reduced set
     * with a flag indicating more data is available.
     *
     * @param data The large array or object to shape.
     * @param options Custom options for this specific call.
     */
    public shape<T>(data: T[], options?: { priority?: 'high' | 'low' }): { data: T[], hasMore: boolean, nextCursor?: number } {
        // Approximate size check (naive JSON stringify length)
        const sizeBytes = JSON.stringify(data).length;
        const sizeMb = sizeBytes / (1024 * 1024);

        if (sizeMb <= this.config.maxInitialPayloadSizeMb) {
            return { data, hasMore: false };
        }

        // Calculate safe chunk size (number of items)
        const avgItemSize = sizeBytes / data.length;
        const maxItems = Math.floor((this.config.maxInitialPayloadSizeMb * 1024 * 1024) / avgItemSize);

        const shapedData = data.slice(0, maxItems);

        return {
            data: shapedData,
            hasMore: true,
            nextCursor: maxItems
        };
    }
}

export const egressShaper = new EgressShaper();
