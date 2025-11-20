# Metadata Analysis Platform Guide

## Overview

The IntelGraph Metadata Analysis Platform provides comprehensive metadata extraction, analysis, and intelligence generation capabilities for digital forensics and intelligence operations. The platform supports a wide range of file types and protocols, offering deep insights into digital artifacts.

## Architecture

The platform consists of several key components:

### Core Packages

1. **@intelgraph/metadata-extractor** - Core framework providing base classes and interfaces
2. **@intelgraph/document-metadata** - Office documents, PDFs, and archives
3. **@intelgraph/image-metadata** - EXIF data, steganography detection
4. **@intelgraph/communication-metadata** - Emails, messaging, VoIP calls
5. **@intelgraph/network-metadata** - Packet captures, protocol metadata
6. **@intelgraph/timeline-analyzer** - Temporal analysis and correlation

### Services

1. **metadata-service** (Port 3100) - REST API for metadata extraction
2. **forensic-analysis-service** (Port 3101) - Attribution and intelligence generation

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Start metadata service
pnpm --filter @intelgraph/metadata-service dev

# Start forensic analysis service
pnpm --filter @intelgraph/forensic-analysis-service dev
```

### Basic Usage

#### Extract Metadata from a File

```typescript
import { globalRegistry } from '@intelgraph/metadata-extractor';
import { OfficeExtractor } from '@intelgraph/document-metadata';
import fs from 'fs';

// Register extractor
const extractor = new OfficeExtractor();
globalRegistry.register(extractor);

// Extract metadata
const fileBuffer = fs.readFileSync('document.docx');
const result = await extractor.extract(fileBuffer, {
  deepScan: true,
  extractEmbedded: true,
});

console.log('Metadata:', result);
```

#### Build and Analyze Timeline

```typescript
import { TimelineBuilder, TimelineAnalyzer } from '@intelgraph/timeline-analyzer';

// Build timeline from extraction results
const builder = new TimelineBuilder();
builder.addResults(extractionResults);
const timeline = builder.build();

// Analyze timeline
const analyzer = new TimelineAnalyzer();
const analysis = analyzer.analyze(timeline);

console.log('Correlations:', analysis.correlations);
console.log('Anomalies:', analysis.anomalies);
console.log('Patterns:', analysis.patterns);
```

## REST API Usage

### Metadata Service

#### Extract Metadata from Single File

```bash
curl -X POST http://localhost:3100/api/extract \
  -F "file=@document.pdf" \
  -F "deepScan=true"
```

#### Extract from Multiple Files

```bash
curl -X POST http://localhost:3100/api/extract/batch \
  -F "files=@file1.jpg" \
  -F "files=@file2.docx" \
  -F "detectSteganography=true"
```

#### Complete Workflow (Extract + Timeline + Analysis)

```bash
curl -X POST http://localhost:3100/api/workflow/complete \
  -F "files=@file1.jpg" \
  -F "files=@file2.pdf" \
  -F "files=@email.eml" \
  -F "deepScan=true"
```

### Forensic Analysis Service

#### Attribution Analysis

```bash
curl -X POST http://localhost:3101/api/analyze/attribution \
  -H "Content-Type: application/json" \
  -d '{"results": [...]}'
```

#### Enrich Metadata

```bash
curl -X POST http://localhost:3101/api/enrich \
  -H "Content-Type: application/json" \
  -d '{"results": [...]}'
```

#### Generate Intelligence Report

```bash
curl -X POST http://localhost:3101/api/intelligence/report \
  -H "Content-Type: application/json" \
  -d '{"results": [...], "options": {}}'
```

## Supported File Types

### Documents
- Microsoft Office (Word, Excel, PowerPoint) - `.docx`, `.xlsx`, `.pptx`
- Legacy Office formats - `.doc`, `.xls`, `.ppt`
- PDF documents - `.pdf`
- Archives - `.zip`, `.rar`, `.7z`, `.tar.gz`

### Images
- JPEG - `.jpg`, `.jpeg`
- TIFF - `.tif`, `.tiff`
- PNG - `.png` (limited EXIF support)
- GIF - `.gif`

### Communications
- Email - `.eml`, `.msg`, RFC 822 format
- mbox archives

### Network
- PCAP files - `.pcap`, `.pcapng`

## Features

### Document Metadata

- Author and editor tracking
- Creation and modification timestamps
- Software version fingerprinting
- Embedded object extraction
- Macro detection
- External link extraction
- Font and style analysis

### Image Intelligence

- EXIF data extraction (GPS, camera, settings)
- Photo timestamp analysis
- Camera and device fingerprinting
- Editing software detection
- Steganography detection
- LSB (Least Significant Bit) analysis
- Statistical anomaly detection

### Communication Analysis

- Email header parsing
- Routing and relay tracking
- Thread correlation
- Attachment analysis
- Authentication result extraction (SPF, DKIM, DMARC)
- Spoofing detection

### Network Analysis

- Packet metadata extraction
- Protocol identification
- Traffic pattern analysis
- Port scanning detection
- Anomaly detection

### Timeline Analysis

- Multi-source timeline construction
- Temporal correlation detection
- Sequence and causality analysis
- Periodic pattern detection
- Gap identification
- Activity burst detection

### Forensic Intelligence

- Attribution analysis
- Relationship mapping
- Metadata enrichment
- Anomaly detection
- Intelligence report generation

## Configuration Options

### Extractor Configuration

```typescript
interface ExtractorConfig {
  deepScan: boolean;              // Perform deep analysis
  extractDeleted: boolean;        // Extract deleted content
  extractHidden: boolean;         // Extract hidden data
  extractEmbedded: boolean;       // Extract embedded objects
  detectSteganography: boolean;   // Detect hidden data
  detectTampering: boolean;       // Detect modifications
  generateHashes: boolean;        // Generate file hashes
  enrichFromExternal: boolean;    // Enrich from external sources
  maxFileSize: number;            // Maximum file size (bytes)
  timeout: number;                // Extraction timeout (ms)
}
```

## Best Practices

### Performance

1. **Batch Processing**: Use batch endpoints for multiple files
2. **Timeouts**: Set appropriate timeouts for large files
3. **Deep Scan**: Only enable deep scan when necessary
4. **File Size Limits**: Set reasonable size limits

### Security

1. **Input Validation**: Always validate file types before processing
2. **Sandboxing**: Process untrusted files in isolated environments
3. **Resource Limits**: Enforce memory and CPU limits
4. **Virus Scanning**: Scan files before metadata extraction

### Forensic Integrity

1. **Hash Verification**: Always generate and verify file hashes
2. **Chain of Custody**: Log all extraction operations
3. **Immutability**: Never modify original files
4. **Timestamping**: Record exact extraction timestamps

## Troubleshooting

### Common Issues

#### Extraction Timeout

```typescript
// Increase timeout for large files
const result = await extractor.extract(buffer, {
  timeout: 120000 // 2 minutes
});
```

#### Unsupported File Type

```typescript
// Check if file type is supported
if (!extractor.canExtract(buffer, mimeType)) {
  console.error('File type not supported');
}
```

#### Memory Issues

```typescript
// Set file size limit
const config = {
  maxFileSize: 50 * 1024 * 1024 // 50MB
};
```

## Advanced Topics

### Custom Extractors

Create custom extractors by extending BaseExtractor:

```typescript
import { BaseExtractor, ExtractionResult, ExtractorConfig } from '@intelgraph/metadata-extractor';

class CustomExtractor extends BaseExtractor {
  readonly name = 'custom-extractor';
  readonly supportedTypes = ['application/custom'];

  canExtract(file: string | Buffer, mimeType?: string): boolean {
    // Implementation
    return true;
  }

  protected async extractInternal(
    file: string | Buffer,
    config: ExtractorConfig
  ): Promise<Partial<ExtractionResult>> {
    // Implementation
    return {};
  }
}
```

### Custom Enrichers

Add custom enrichment logic:

```typescript
import { IMetadataEnricher, ExtractionResult } from '@intelgraph/metadata-extractor';

class GeoEnricher implements IMetadataEnricher {
  readonly name = 'geo-enricher';

  canEnrich(metadata: ExtractionResult): boolean {
    return !!metadata.geolocation;
  }

  async enrich(metadata: ExtractionResult): Promise<ExtractionResult> {
    // Add reverse geocoding, weather data, etc.
    return metadata;
  }
}
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/intelgraph/platform/issues
- Documentation: https://docs.intelgraph.com
- Email: support@intelgraph.com

## License

MIT License - See LICENSE file for details
