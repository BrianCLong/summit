/**
 * MongoDB Metadata Extractor
 * Extracts schema and metadata from MongoDB databases
 */

import { DiscoveredAsset, ExtractionResult, ExtractionStatistics } from '../types/discovery.js';

export interface MongoDBConnection {
  db(name: string): MongoDatabase;
  close(): Promise<void>;
}

export interface MongoDatabase {
  listCollections(): { toArray(): Promise<any[]> };
  collection(name: string): MongoCollection;
  stats(): Promise<any>;
}

export interface MongoCollection {
  findOne(): Promise<any>;
  find(query?: any): { limit(n: number): { toArray(): Promise<any[]> } };
  estimatedDocumentCount(): Promise<number>;
  indexes(): Promise<any[]>;
}

export class MongoDBExtractor {
  constructor(
    private connection: MongoDBConnection,
    private databaseName: string
  ) {}

  /**
   * Extract metadata from MongoDB database
   */
  async extract(): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      const assets: DiscoveredAsset[] = [];
      const db = this.connection.db(this.databaseName);

      // Get all collections
      const collections = await db.listCollections().toArray();

      for (const collectionInfo of collections) {
        const collectionAsset = await this.extractCollection(db, collectionInfo);
        assets.push(collectionAsset);
      }

      const statistics: ExtractionStatistics = {
        totalAssets: assets.length,
        assetsWithSchema: assets.filter((a) => a.schema !== null).length,
        assetsWithSamples: assets.filter((a) => a.sampleData.length > 0).length,
        relationshipsInferred: 0, // MongoDB relationships are embedded/referenced
        processingTimeMs: Date.now() - startTime,
      };

      return {
        sourceId: 'mongodb',
        assets,
        relationships: [],
        statistics,
      };
    } catch (error) {
      throw new Error(`MongoDB extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract collection metadata
   */
  private async extractCollection(db: MongoDatabase, collectionInfo: any): Promise<DiscoveredAsset> {
    const collection = db.collection(collectionInfo.name);

    // Get sample documents to infer schema
    const sampleDocs = await collection.find().limit(100).toArray();
    const schema = this.inferSchema(sampleDocs);

    // Get document count
    const documentCount = await collection.estimatedDocumentCount();

    // Get indexes
    const indexes = await collection.indexes();

    // Get first 10 documents as samples
    const sampleData = await collection.find().limit(10).toArray();

    return {
      name: `${this.databaseName}.${collectionInfo.name}`,
      type: 'COLLECTION',
      schema: {
        fields: schema.fields,
        indexes: indexes.map((idx: any) => ({
          name: idx.name,
          keys: idx.key,
          unique: idx.unique || false,
        })),
      },
      properties: {
        database: this.databaseName,
        collectionName: collectionInfo.name,
        type: collectionInfo.type,
        documentCount,
      },
      statistics: {
        documentCount,
        avgDocumentSize: schema.avgDocumentSize,
      },
      sampleData: sampleData.map((doc) => {
        // Convert ObjectId to string for serialization
        return JSON.parse(JSON.stringify(doc));
      }),
    };
  }

  /**
   * Infer schema from sample documents
   */
  private inferSchema(documents: any[]): {
    fields: any[];
    avgDocumentSize: number;
  } {
    if (documents.length === 0) {
      return { fields: [], avgDocumentSize: 0 };
    }

    const fieldTypes = new Map<string, Map<string, number>>();
    let totalSize = 0;

    // Analyze all documents
    for (const doc of documents) {
      totalSize += JSON.stringify(doc).length;
      this.analyzeDocument(doc, '', fieldTypes);
    }

    // Convert to field definitions
    const fields = Array.from(fieldTypes.entries()).map(([fieldPath, types]) => {
      const typeArray = Array.from(types.entries()).sort((a, b) => b[1] - a[1]);
      const primaryType = typeArray[0][0];
      const allTypes = typeArray.map((t) => t[0]);

      return {
        name: fieldPath,
        types: allTypes,
        primaryType,
        nullable: documents.some((doc) => this.getNestedValue(doc, fieldPath) == null),
        occurrenceRate: types.get(primaryType)! / documents.length,
      };
    });

    return {
      fields: fields.sort((a, b) => a.name.localeCompare(b.name)),
      avgDocumentSize: Math.round(totalSize / documents.length),
    };
  }

  /**
   * Recursively analyze document structure
   */
  private analyzeDocument(
    obj: any,
    prefix: string,
    fieldTypes: Map<string, Map<string, number>>
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const type = this.getValueType(value);

      if (!fieldTypes.has(fieldPath)) {
        fieldTypes.set(fieldPath, new Map());
      }

      const typeMap = fieldTypes.get(fieldPath)!;
      typeMap.set(type, (typeMap.get(type) || 0) + 1);

      // Recurse into nested objects
      if (type === 'object' && value !== null) {
        this.analyzeDocument(value, fieldPath, fieldTypes);
      }
    }
  }

  /**
   * Get type of value
   */
  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object' && value.constructor.name === 'ObjectId') return 'objectid';
    return typeof value;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current == null) return null;
      current = current[part];
    }

    return current;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.connection.close();
  }
}
