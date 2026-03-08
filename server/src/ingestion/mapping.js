"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMapping = applyMapping;
function applyMapping(record, mapping) {
    const result = {};
    for (const field of mapping.fields) {
        let value = record[field.sourceField];
        if (value !== undefined && value !== null) {
            if (field.transform) {
                switch (field.transform) {
                    case 'uppercase':
                        value = String(value).toUpperCase();
                        break;
                    case 'lowercase':
                        value = String(value).toLowerCase();
                        break;
                    case 'trim':
                        value = String(value).trim();
                        break;
                    case 'date':
                        // Basic date parsing
                        value = new Date(value).toISOString();
                        break;
                }
            }
            result[field.targetField] = value;
        }
    }
    return result;
}
