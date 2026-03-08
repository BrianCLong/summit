"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RssConnector = void 0;
const rss_parser_1 = __importDefault(require("rss-parser"));
class RssConnector {
    parser = new rss_parser_1.default();
    async discover() {
        return [
            { id: 'rss-1', name: 'TechCrunch', type: 'rss', metadata: { url: 'https://techcrunch.com/feed/' } }
        ];
    }
    async *pull(resource, state) {
        if (!resource.metadata?.url)
            return;
        try {
            const feed = await this.parser.parseURL(resource.metadata.url);
            for (const item of feed.items) {
                yield {
                    id: item.guid || item.link || 'unknown',
                    data: item,
                    extractedAt: new Date()
                };
            }
        }
        catch (e) {
            console.error('RSS fetch failed', e);
        }
    }
    async ack(checkpoint) {
        // No-op for RSS usually
    }
    async checkpoint(state) {
        return {
            resourceId: 'rss-1',
            cursor: Date.now().toString(),
            timestamp: Date.now()
        };
    }
}
exports.RssConnector = RssConnector;
