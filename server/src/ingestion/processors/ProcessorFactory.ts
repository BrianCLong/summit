import { BaseProcessor } from './BaseProcessor.js';
import { TextProcessor } from './TextProcessor.js';
import { PdfProcessor } from './PdfProcessor.js';
import * as path from 'path';

export class ProcessorFactory {
  private processors: BaseProcessor[] = [];

  constructor() {
    this.processors.push(new TextProcessor());
    this.processors.push(new PdfProcessor());
  }

  getProcessor(filename: string): BaseProcessor {
    const ext = path.extname(filename).toLowerCase();
    const processor = this.processors.find(p => p.supportedExtensions.includes(ext));

    if (!processor) {
      // Default to text processor if unknown, it might handle it or fail gracefully
      return new TextProcessor();
    }
    return processor;
  }
}
