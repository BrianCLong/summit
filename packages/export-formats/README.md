# @summit/export-formats

Multi-format export system for intelligence reports supporting PDF, DOCX, PPTX, HTML, Excel, CSV, JSON, and XML formats.

## Features

- PDF generation with classification banners
- Word document (DOCX) export
- PowerPoint (PPTX) slide decks
- HTML reports with responsive design
- Excel spreadsheets for tabular data
- CSV data exports
- JSON/XML for API integration
- Watermarking support
- Custom styling and branding

## Usage

```typescript
import { PDFExporter } from '@summit/export-formats';

const exporter = new PDFExporter();

const pdf = await exporter.exportToPDF(report, {
  pageSize: 'LETTER',
  orientation: 'PORTRAIT',
  includeClassificationBanner: true,
  includePageNumbers: true,
  includeTOC: true,
  watermark: 'DRAFT'
});
```
