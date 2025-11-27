import { Enricher } from './enricher';

export class OCREnricher implements Enricher {
  name = 'ocr';

  async enrich(data: Record<string, any>): Promise<Record<string, any>> {
    if (data.file_path && data.file_path.endsWith('.pdf')) {
      // Mock enrichment
      data.text_content = 'Mock OCR text content.';
    }
    return data;
  }
}
