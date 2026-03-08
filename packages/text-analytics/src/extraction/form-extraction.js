"use strict";
/**
 * Form field extraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormExtractor = void 0;
class FormExtractor {
    /**
     * Extract structured form data from text
     */
    extract(text) {
        const fields = new Map();
        // Extract common form patterns
        const patterns = [
            { key: 'name', pattern: /name:\s*(.+?)(?:\n|$)/i },
            { key: 'email', pattern: /email:\s*(.+?)(?:\n|$)/i },
            { key: 'phone', pattern: /phone:\s*(.+?)(?:\n|$)/i },
            { key: 'address', pattern: /address:\s*(.+?)(?:\n|$)/i },
        ];
        for (const { key, pattern } of patterns) {
            const match = text.match(pattern);
            if (match) {
                fields.set(key, match[1].trim());
            }
        }
        return fields;
    }
}
exports.FormExtractor = FormExtractor;
