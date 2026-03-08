"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProcessor = void 0;
class BaseProcessor {
    createDocument(text, metadata) {
        const now = new Date().toISOString();
        return {
            id: metadata.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tenantId: metadata.tenantId,
            text: text,
            metadata: metadata,
            source: metadata.source,
            mimeType: metadata.mimeType,
            title: metadata.title,
            entityIds: [],
            createdAt: metadata.createdAt || now,
            updatedAt: metadata.updatedAt || now,
        };
    }
}
exports.BaseProcessor = BaseProcessor;
