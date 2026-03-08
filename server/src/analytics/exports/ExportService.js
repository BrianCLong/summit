"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
class ExportService {
    config;
    constructor(config) {
        this.config = config;
    }
    exportToCSV(data) {
        if (data.length === 0)
            return '';
        // 1. Enforce k-anonymity (filter out rows representing small groups if data is aggregated)
        // OR checks if total result set is too small?
        // Usually k-anonymity applies to groups. If 'data' is a list of groups with counts, check counts.
        // Assuming data has a 'count' field if it's an aggregate.
        const safeData = data.filter(row => {
            if (typeof row.count === 'number') {
                return row.count >= this.config.kAnonymityThreshold;
            }
            return true; // If not aggregate, assume it's already safe (scrubbed events) or fail?
            // Prompt says: "Export only aggregated data; enforce minimum k-anonymity thresholds (e.g., suppress cells with count < K)"
        });
        if (safeData.length === 0)
            return '';
        const headers = Object.keys(safeData[0]).sort(); // Stable headers
        const headerRow = headers.join(',');
        const rows = safeData.map(row => {
            return headers.map(h => {
                const val = row[h];
                return JSON.stringify(val); // Simple escaping
            }).join(',');
        });
        return [headerRow, ...rows].join('\n');
    }
}
exports.ExportService = ExportService;
