import { BaseProcessor } from './BaseProcessor.js';
import { Document } from '../../data-model/types.js';

export class TextProcessor extends BaseProcessor {
  supportedExtensions = ['.txt', '.md', '.markdown', '.js', '.js', '.py', '.json', '.csv', '.yaml', '.yml'];

  async process(content: Buffer, metadata: Record<string, any>): Promise<Document[]> {
    const text = content.toString('utf-8');
    // For now, we treat the whole file as one document.
    // In future, we could split Markdown by headers here if we wanted "Section" level documents.
    return [this.createDocument(text, { ...metadata, mimeType: 'text/plain' })];
  }
}
