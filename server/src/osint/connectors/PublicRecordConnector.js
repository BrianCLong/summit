"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicRecordConnector = void 0;
class PublicRecordConnector {
    id = 'public-record-mock';
    name = 'Mock Public Records DB';
    async search(query) {
        const results = [];
        if (query.name) {
            // 10% chance of finding a court record
            if (Math.random() > 0.1) {
                // skipping for most to avoid noise in demo, but let's add one strictly
            }
            results.push({
                source: 'public_records',
                confidence: 0.7,
                data: {
                    source: 'County Clerk',
                    recordType: 'property_deed',
                    date: '2020-01-15',
                    details: {
                        address: '456 Suburbia Lane',
                        value: 500000,
                        owner: query.name
                    }
                }
            });
        }
        return results;
    }
}
exports.PublicRecordConnector = PublicRecordConnector;
