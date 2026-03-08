"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextProcessor = void 0;
const BaseProcessor_js_1 = require("./BaseProcessor.js");
class TextProcessor extends BaseProcessor_js_1.BaseProcessor {
    supportedExtensions = ['.txt', '.md', '.markdown', '.js', '.js', '.py', '.json', '.csv', '.yaml', '.yml'];
    async process(content, metadata) {
        const text = content.toString('utf-8');
        // For now, we treat the whole file as one document.
        // In future, we could split Markdown by headers here if we wanted "Section" level documents.
        return [this.createDocument(text, { ...metadata, mimeType: 'text/plain' })];
    }
}
exports.TextProcessor = TextProcessor;
