"use strict";
/**
 * JSON Report Exporter
 * Exports reports to JSON format for programmatic access
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
exports.JSONExporter = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const IReportExporter_js_1 = require("./IReportExporter.js");
class JSONExporter extends IReportExporter_js_1.BaseReportExporter {
    format = 'JSON';
    mimeType = 'application/json';
    extension = 'json';
    supports = ['data', 'structured'];
    async export(report, template) {
        const jsonData = this.buildJSONData(report, template);
        const jsonContent = JSON.stringify(jsonData, null, 2);
        const filename = this.generateFilename(report);
        const filepath = path.join('/tmp', filename);
        await fs_1.promises.writeFile(filepath, jsonContent, 'utf-8');
        return {
            format: this.format.toLowerCase(),
            path: filepath,
            size: Buffer.byteLength(jsonContent, 'utf-8'),
            mimeType: this.mimeType,
            filename,
            json: jsonContent,
        };
    }
    buildJSONData(report, template) {
        const metadata = {
            reportId: report.id,
            templateId: report.templateId,
            generatedAt: new Date(),
            generatedBy: report.requestedBy,
            parameters: report.parameters,
        };
        return {
            metadata,
            template: {
                id: template.id,
                name: template.name,
                category: template.category,
            },
            sections: report.sections.map((section) => ({
                name: section.name,
                title: section.title,
                data: section.data,
                generatedAt: section.generatedAt,
            })),
            executionTime: report.executionTime,
            status: report.status,
        };
    }
}
exports.JSONExporter = JSONExporter;
