"use strict";
/**
 * Exporter Factory
 * Creates appropriate exporter based on format
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExporterFactory = void 0;
const HTMLExporter_js_1 = require("./HTMLExporter.js");
const JSONExporter_js_1 = require("./JSONExporter.js");
const CSVExporter_js_1 = require("./CSVExporter.js");
const PDFExporter_js_1 = require("./PDFExporter.js");
const PPTXExporter_js_1 = require("./PPTXExporter.js");
class ExporterFactory {
    exporters = new Map();
    constructor() {
        this.registerDefaultExporters();
    }
    /**
     * Register default exporters
     */
    registerDefaultExporters() {
        this.registerExporter(new HTMLExporter_js_1.HTMLExporter());
        this.registerExporter(new JSONExporter_js_1.JSONExporter());
        this.registerExporter(new CSVExporter_js_1.CSVExporter());
        this.registerExporter(new PDFExporter_js_1.PDFExporter());
        this.registerExporter(new PPTXExporter_js_1.PPTXExporter());
    }
    /**
     * Register a custom exporter
     */
    registerExporter(exporter) {
        const format = exporter.format.toUpperCase();
        this.exporters.set(format, exporter);
    }
    /**
     * Get exporter for a specific format
     */
    getExporter(format) {
        const normalizedFormat = format.toUpperCase();
        const exporter = this.exporters.get(normalizedFormat);
        if (!exporter) {
            throw new Error(`No exporter registered for format: ${format}`);
        }
        return exporter;
    }
    /**
     * Check if an exporter exists for a format
     */
    hasExporter(format) {
        const normalizedFormat = format.toUpperCase();
        return this.exporters.has(normalizedFormat);
    }
    /**
     * Get all supported formats
     */
    getSupportedFormats() {
        return Array.from(this.exporters.keys());
    }
    /**
     * Get exporter metadata
     */
    getExporterInfo(format) {
        const exporter = this.getExporter(format);
        return {
            format: exporter.format,
            mimeType: exporter.mimeType,
            extension: exporter.extension,
            supports: exporter.supports,
        };
    }
}
exports.ExporterFactory = ExporterFactory;
