import { Document } from '../../data-model/types.js';

export abstract class BaseProcessor {
  abstract supportedExtensions: string[];

  abstract process(content: Buffer, metadata: Record<string, any>): Promise<Document[]>;

  protected createDocument(text: string, metadata: Record<string, any>): Document {
    const now = new Date().toISOString();
    return {
      id: metadata.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId: metadata.tenantId,
      text: text,
      metadata: metadata,
      source: metadata.source,
      mimeType: metadata.mimeType,
      title: metadata.title,
      entityIds: [],
      createdAt: metadata.createdAt || now,
      updatedAt: metadata.updatedAt || now,
    };
  }
}
