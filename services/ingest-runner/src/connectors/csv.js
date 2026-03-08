"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvConnector = void 0;
const csv_parse_1 = require("csv-parse");
const fs_1 = __importDefault(require("fs"));
class CsvConnector {
    async discover() {
        // In a real scenario, this would scan a directory
        return [
            {
                id: 'csv-1',
                name: 'example.csv',
                type: 'csv',
                metadata: { filepath: process.env.CSV_SOURCE_PATH || '/tmp/data.csv' }
            }
        ];
    }
    async *pull(resource, state) {
        const filepath = resource.metadata?.filepath;
        if (!filepath || !fs_1.default.existsSync(filepath)) {
            console.warn(`CSV file not found: ${filepath}`);
            return;
        }
        const parser = fs_1.default.createReadStream(filepath).pipe((0, csv_parse_1.parse)({ columns: true }));
        let index = 0;
        // Parse cursor if exists (format: "csv-1-INDEX")
        let lastProcessedIndex = -1;
        if (state?.cursor) {
            const parts = state.cursor.split('-');
            const idxStr = parts[parts.length - 1];
            const parsed = parseInt(idxStr, 10);
            if (!isNaN(parsed)) {
                lastProcessedIndex = parsed;
            }
        }
        for await (const record of parser) {
            index++;
            if (index <= lastProcessedIndex) {
                continue;
            }
            yield {
                id: `${resource.id}-${index}`,
                data: record,
                extractedAt: new Date()
            };
        }
    }
    async ack(checkpoint) {
        console.log('Acked', checkpoint);
    }
    async checkpoint(state) {
        return {
            resourceId: 'csv-1',
            cursor: state.cursor,
            timestamp: Date.now()
        };
    }
}
exports.CsvConnector = CsvConnector;
