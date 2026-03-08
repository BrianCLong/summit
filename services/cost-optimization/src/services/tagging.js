"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaggingService = void 0;
class TaggingService {
    async getUntaggedResources(options) {
        return [];
    }
    async enforceTagging(options) {
        return { success: true, taggedCount: 0 };
    }
    async scanForUntaggedResources() {
        // Scan implementation
    }
}
exports.TaggingService = TaggingService;
