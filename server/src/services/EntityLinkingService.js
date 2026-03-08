"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EntityLinkingService {
    async linkEntity(entity, context) {
        return [];
    }
    async findLinks(text) {
        return [];
    }
    static async suggestLinksForEntity(entityId, context) {
        return { success: true, links: [] };
    }
}
exports.default = EntityLinkingService;
