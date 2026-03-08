"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const xml_exporter_js_1 = require("../exporters/xml-exporter.js");
(0, globals_1.describe)('XmlExporter', () => {
    let exporter;
    (0, globals_1.beforeEach)(() => {
        exporter = new xml_exporter_js_1.XmlExporter();
    });
    (0, globals_1.it)('should export simple object to XML', async () => {
        const data = { key: 'value' };
        const artifact = await exporter.export(data);
        (0, globals_1.expect)(artifact.format).toBe('xml');
        (0, globals_1.expect)(artifact.mimeType).toBe('application/xml');
        const xml = artifact.buffer.toString();
        (0, globals_1.expect)(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        (0, globals_1.expect)(xml).toContain('<root>');
        (0, globals_1.expect)(xml).toContain('<key>value</key>');
        (0, globals_1.expect)(xml).toContain('</root>');
    });
    (0, globals_1.it)('should sanitize invalid tag names', async () => {
        const data = {
            'invalid tag name': 'value',
            '123startWithNumber': 'value'
        };
        const artifact = await exporter.export(data);
        const xml = artifact.buffer.toString();
        (0, globals_1.expect)(xml).toContain('<invalid_tag_name>value</invalid_tag_name>');
        (0, globals_1.expect)(xml).toContain('<_123startWithNumber>value</_123startWithNumber>');
    });
    (0, globals_1.it)('should handle nested objects', async () => {
        const data = {
            user: {
                name: 'Alice',
                role: 'admin'
            }
        };
        const artifact = await exporter.export(data);
        const xml = artifact.buffer.toString();
        (0, globals_1.expect)(xml).toContain('<user>');
        (0, globals_1.expect)(xml).toContain('<name>Alice</name>');
        (0, globals_1.expect)(xml).toContain('<role>admin</role>');
        (0, globals_1.expect)(xml).toContain('</user>');
    });
    (0, globals_1.it)('should handle arrays', async () => {
        const data = {
            items: [
                { id: 1 },
                { id: 2 }
            ]
        };
        const artifact = await exporter.export(data);
        const xml = artifact.buffer.toString();
        (0, globals_1.expect)(xml).toContain('<items>');
        (0, globals_1.expect)(xml).toContain('<id>1</id>');
        (0, globals_1.expect)(xml).toContain('<id>2</id>');
    });
    (0, globals_1.it)('should include watermark comment', async () => {
        const data = { key: 'value' };
        const artifact = await exporter.export(data, { watermark: 'CONFIDENTIAL' });
        const xml = artifact.buffer.toString();
        (0, globals_1.expect)(xml).toContain('<!-- Watermark: CONFIDENTIAL -->');
    });
    (0, globals_1.it)('should escape special characters', async () => {
        const data = { content: '<script>alert("xss")</script> & more' };
        const artifact = await exporter.export(data);
        const xml = artifact.buffer.toString();
        (0, globals_1.expect)(xml).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; more');
    });
});
