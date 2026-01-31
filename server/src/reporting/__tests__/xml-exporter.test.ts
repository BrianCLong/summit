import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { XmlExporter } from '../exporters/xml-exporter';

describe('XmlExporter', () => {
  let exporter: XmlExporter;

  beforeEach(() => {
    exporter = new XmlExporter();
  });

  it('should export simple object to XML', async () => {
    const data = { key: 'value' };
    const artifact = await exporter.export(data);

    expect(artifact.format).toBe('xml');
    expect(artifact.mimeType).toBe('application/xml');

    const xml = artifact.buffer.toString();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<root>');
    expect(xml).toContain('<key>value</key>');
    expect(xml).toContain('</root>');
  });

  it('should sanitize invalid tag names', async () => {
    const data = {
      'invalid tag name': 'value',
      '123startWithNumber': 'value'
    };
    const artifact = await exporter.export(data);
    const xml = artifact.buffer.toString();

    expect(xml).toContain('<invalid_tag_name>value</invalid_tag_name>');
    expect(xml).toContain('<_123startWithNumber>value</_123startWithNumber>');
  });

  it('should handle nested objects', async () => {
    const data = {
      user: {
        name: 'Alice',
        role: 'admin'
      }
    };
    const artifact = await exporter.export(data);
    const xml = artifact.buffer.toString();

    expect(xml).toContain('<user>');
    expect(xml).toContain('<name>Alice</name>');
    expect(xml).toContain('<role>admin</role>');
    expect(xml).toContain('</user>');
  });

  it('should handle arrays', async () => {
    const data = {
      items: [
        { id: 1 },
        { id: 2 }
      ]
    };
    const artifact = await exporter.export(data);
    const xml = artifact.buffer.toString();

    expect(xml).toContain('<items>');
    expect(xml).toContain('<id>1</id>');
    expect(xml).toContain('<id>2</id>');
  });

  it('should include watermark comment', async () => {
    const data = { key: 'value' };
    const artifact = await exporter.export(data, { watermark: 'CONFIDENTIAL' });
    const xml = artifact.buffer.toString();

    expect(xml).toContain('<!-- Watermark: CONFIDENTIAL -->');
  });

  it('should escape special characters', async () => {
    const data = { content: '<script>alert("xss")</script> & more' };
    const artifact = await exporter.export(data);
    const xml = artifact.buffer.toString();

    expect(xml).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; more');
  });
});
