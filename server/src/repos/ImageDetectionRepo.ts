import { neo } from '../db/neo4j.js';

export interface StoredDetection {
  id: string;
  mediaSourceId: string;
  className: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    area: number;
    confidence: number;
  };
  tenantId?: string;
  processedAt: string;
}

export class ImageDetectionRepo {
  async storeDetections(
    mediaSourceId: string,
    detections: StoredDetection[],
    tenantId?: string,
  ): Promise<void> {
    if (detections.length === 0) {
      return;
    }

    await neo.merge(
      `MERGE (image:ImageAsset { id: $mediaSourceId })
         ON CREATE SET image.createdAt = datetime(), image.tenantId = $tenantId
         SET image.updatedAt = datetime(), image.lastProcessedAt = datetime()
       WITH image
       UNWIND $detections AS detection
         MERGE (det:DetectedObject { id: detection.id })
         SET det.className = detection.className,
             det.confidence = detection.confidence,
             det.boundingBox = detection.boundingBox,
             det.processedAt = datetime(detection.processedAt),
             det.tenantId = $tenantId
         MERGE (image)-[:HAS_DETECTED_OBJECT]->(det)`,
      { mediaSourceId, detections, tenantId },
      { tenantId },
    );
  }

  async getDetections(mediaSourceId: string, tenantId?: string): Promise<StoredDetection[]> {
    const result = await neo.run(
      `MATCH (image:ImageAsset { id: $mediaSourceId })-[:HAS_DETECTED_OBJECT]->(det:DetectedObject)
       RETURN det ORDER BY det.processedAt DESC`,
      { mediaSourceId },
      { tenantId },
    );

    return result.records.map((record) => {
      const node = record.get('det');
      const properties = node.properties;
      return {
        id: properties.id,
        mediaSourceId,
        className: properties.className,
        confidence: properties.confidence,
        boundingBox: properties.boundingBox,
        tenantId: properties.tenantId,
        processedAt: properties.processedAt,
      } as StoredDetection;
    });
  }
}

export default ImageDetectionRepo;
