"use strict";
/**
 * CSV Report Exporter
 * Exports tabular report data to CSV format
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSVExporter = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const IReportExporter_js_1 = require("./IReportExporter.js");
class CSVExporter extends IReportExporter_js_1.BaseReportExporter {
    format = 'CSV';
    mimeType = 'text/csv';
    extension = 'csv';
    supports = ['tabular_data'];
    async export(report, template) {
        const csvContent = this.generateCSVContent(report);
        const filename = this.generateFilename(report);
        const filepath = path.join('/tmp', filename);
        await fs_1.promises.writeFile(filepath, csvContent, 'utf-8');
        return {
            format: this.format.toLowerCase(),
            path: filepath,
            size: Buffer.byteLength(csvContent, 'utf-8'),
            mimeType: this.mimeType,
            filename,
            csv: csvContent,
        };
    }
    canExport(report) {
        if (!super.canExport(report)) {
            return false;
        }
        // CSV export requires tabular data
        return this.hasTabularData(report);
    }
    hasTabularData(report) {
        // Check if report has entities or other tabular data
        return !!(report.data?.entities?.length > 0 || report.data?.items?.length > 0);
    }
    generateCSVContent(report) {
        // Extract tabular data from report
        const data = this.extractTabularData(report);
        return this.convertToCSV(data);
    }
    extractTabularData(report) {
        // Priority: entities, then items, then relationships
        if (report.data?.entities?.length > 0) {
            return report.data.entities;
        }
        if (report.data?.items?.length > 0) {
            return report.data.items;
        }
        if (report.data?.relationships?.length > 0) {
            return report.data.relationships;
        }
        // Fallback: extract from sections
        for (const section of report.sections) {
            if (section.data?.entities?.length > 0) {
                return section.data.entities;
            }
            if (Array.isArray(section.data)) {
                return section.data;
            }
        }
        return [];
    }
    convertToCSV(data) {
        if (data.length === 0) {
            return 'No data available';
        }
        // Get all unique keys from all objects
        const keys = Array.from(new Set(data.flatMap((item) => Object.keys(item))));
        // Create header row
        const header = keys.join(',');
        // Create data rows
        const rows = data.map((item) => {
            return keys
                .map((key) => {
                const value = item[key];
                // Handle CSV escaping
                if (value === null || value === undefined) {
                    return '';
                }
                const stringValue = String(value);
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            })
                .join(',');
        });
        return [header, ...rows].join('\n');
    }
}
exports.CSVExporter = CSVExporter;
