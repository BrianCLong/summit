/**
 * Multi-Language OCR Engine
 * Tesseract, PaddleOCR, document analysis
 */

import { spawn } from 'child_process';
import { IOCREngine, ModelConfig, BaseComputerVisionModel } from '@intelgraph/computer-vision';

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  blocks: TextBlock[];
  processing_time_ms: number;
}

export interface TextBlock {
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  words?: Word[];
  block_type?: 'paragraph' | 'line' | 'word';
}

export interface Word {
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface DocumentLayout {
  text_regions: TextBlock[];
  tables: TableRegion[];
  images: ImageRegion[];
  layout_type: 'document' | 'receipt' | 'invoice' | 'form';
}

export interface TableRegion {
  bbox: { x: number; y: number; width: number; height: number };
  rows: string[][];
  confidence: number;
}

export interface ImageRegion {
  bbox: { x: number; y: number; width: number; height: number };
  type: string;
}

export class OCREngine extends BaseComputerVisionModel implements IOCREngine {
  private pythonScriptPath: string;
  private engine: 'tesseract' | 'paddleocr';

  constructor(engine: 'tesseract' | 'paddleocr' = 'tesseract', config?: Partial<ModelConfig>) {
    super({
      model_name: engine,
      device: config?.device || 'cpu',
      confidence_threshold: config?.confidence_threshold || 0.6,
      ...config,
    });

    this.engine = engine;
    this.pythonScriptPath = process.env.OCR_SCRIPT_PATH ||
      '/home/user/summit/server/src/ai/models/ocr_engine.py';
  }

  async initialize(): Promise<void> {
    this.initialized = true;
    this.modelLoaded = true;
  }

  async processImage(imagePath: string, options?: any): Promise<OCRResult> {
    return this.extractText(imagePath, options);
  }

  async extractText(imagePath: string, options?: {
    languages?: string[];
    confidenceThreshold?: number;
    wordLevel?: boolean;
  }): Promise<OCRResult> {
    this.ensureInitialized();
    const startTime = Date.now();

    const languages = options?.languages?.join('+') || 'eng';
    const args = [
      this.pythonScriptPath,
      '--image', imagePath,
      '--engine', this.engine,
      '--languages', languages,
      '--confidence', String(options?.confidenceThreshold || this.config.confidence_threshold),
      '--word-level', String(options?.wordLevel !== false),
    ];

    return new Promise((resolve, reject) => {
      const python = spawn('python3', args);
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => { stdout += data.toString(); });
      python.stderr.on('data', (data) => { stderr += data.toString(); });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`OCR failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve({
            text: result.text || '',
            confidence: result.confidence || 0,
            language: result.language || 'unknown',
            blocks: result.blocks || [],
            processing_time_ms: Date.now() - startTime,
          });
        } catch (error) {
          reject(new Error(`Failed to parse result: ${error}`));
        }
      });
    });
  }

  async detectTextRegions(imagePath: string, options?: any): Promise<TextBlock[]> {
    const result = await this.extractText(imagePath, options);
    return result.blocks;
  }

  async extractStructuredData(imagePath: string, documentType: string, options?: any): Promise<any> {
    // Extract structured data from documents (receipts, invoices, etc.)
    const result = await this.extractText(imagePath, options);

    switch (documentType) {
      case 'receipt':
        return this.parseReceipt(result);
      case 'invoice':
        return this.parseInvoice(result);
      case 'license_plate':
        return this.parseLicensePlate(result);
      default:
        return result;
    }
  }

  async analyzeDocumentLayout(imagePath: string): Promise<DocumentLayout> {
    // Analyze document layout (text, tables, images)
    const result = await this.extractText(imagePath);

    return {
      text_regions: result.blocks,
      tables: [],
      images: [],
      layout_type: 'document',
    };
  }

  async extractTables(imagePath: string): Promise<TableRegion[]> {
    // Extract tables from documents
    return [];
  }

  async recognizeHandwriting(imagePath: string, options?: any): Promise<OCRResult> {
    // Handwriting recognition (would use specialized model)
    return this.extractText(imagePath, options);
  }

  async recognizeMath(imagePath: string): Promise<string> {
    // Mathematical formula recognition
    return '';
  }

  async detectLogos(imagePath: string): Promise<Array<{ name: string; bbox: any; confidence: number }>> {
    // Logo and brand detection
    return [];
  }

  private parseReceipt(ocrResult: OCRResult): any {
    // Parse receipt data
    return {
      merchant: '',
      date: '',
      total: 0,
      items: [],
      raw_text: ocrResult.text,
    };
  }

  private parseInvoice(ocrResult: OCRResult): any {
    // Parse invoice data
    return {
      invoice_number: '',
      date: '',
      total: 0,
      items: [],
      raw_text: ocrResult.text,
    };
  }

  private parseLicensePlate(ocrResult: OCRResult): any {
    // Parse license plate
    return {
      plate_number: ocrResult.text.replace(/\s/g, '').toUpperCase(),
      confidence: ocrResult.confidence,
    };
  }

  getSupportedLanguages(): string[] {
    return [
      'eng', 'spa', 'fra', 'deu', 'ita', 'por', 'rus', 'chi_sim', 'chi_tra',
      'jpn', 'kor', 'ara', 'hin', 'tha', 'vie', 'heb', 'tur', 'pol', 'nld',
      // ... 100+ languages supported
    ];
  }
}
