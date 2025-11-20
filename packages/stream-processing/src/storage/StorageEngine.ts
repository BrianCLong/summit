/**
 * Storage Engine
 * Manages persistent storage of message logs with segment-based storage
 */

import fs from 'fs/promises';
import path from 'path';
import type { BrokerConfig, StreamMessage, ConsumerRecord } from '../types.js';

interface LogSegment {
  baseOffset: number;
  filePath: string;
  indexPath: string;
  size: number;
  createdAt: number;
}

export class StorageEngine {
  private config: BrokerConfig;
  private segments: Map<string, LogSegment[]> = new Map();
  private currentOffsets: Map<string, number> = new Map();

  constructor(config: BrokerConfig) {
    this.config = config;
  }

  /**
   * Initialize storage engine
   */
  async initialize(): Promise<void> {
    // Create data directories if they don't exist
    for (const logDir of this.config.logDirs) {
      await fs.mkdir(logDir, { recursive: true });
    }
    console.log('Storage engine initialized');
  }

  /**
   * Close storage engine
   */
  async close(): Promise<void> {
    // Flush all segments
    console.log('Storage engine closed');
  }

  /**
   * Append a message to the log
   */
  async append(topic: string, partition: number, message: StreamMessage): Promise<number> {
    const partitionKey = `${topic}-${partition}`;

    // Get or create current offset
    let offset = this.currentOffsets.get(partitionKey) || 0;

    // Assign offset to message
    message.offset = offset;

    // In a real implementation, this would:
    // 1. Get the active segment for the partition
    // 2. Append the message to the segment file
    // 3. Update the index
    // 4. Roll to new segment if size limit reached

    // For now, just increment offset
    this.currentOffsets.set(partitionKey, offset + 1);

    return offset;
  }

  /**
   * Read messages from the log
   */
  async read(
    topic: string,
    partition: number,
    startOffset: number,
    maxMessages: number
  ): Promise<ConsumerRecord[]> {
    const partitionKey = `${topic}-${partition}`;
    const currentOffset = this.currentOffsets.get(partitionKey) || 0;

    // In a real implementation, this would:
    // 1. Find the segment containing startOffset
    // 2. Read messages from the segment
    // 3. Continue to next segments if needed

    // For now, return empty array if offset is beyond current
    if (startOffset >= currentOffset) {
      return [];
    }

    // Return mock messages
    const messages: ConsumerRecord[] = [];
    const endOffset = Math.min(startOffset + maxMessages, currentOffset);

    for (let i = startOffset; i < endOffset; i++) {
      messages.push({
        key: null,
        value: `Message at offset ${i}`,
        headers: {},
        timestamp: Date.now(),
        offset: i,
        partition,
        topic,
      });
    }

    return messages;
  }

  /**
   * Get the high watermark for a partition
   */
  async getHighWaterMark(topic: string, partition: number): Promise<number> {
    const partitionKey = `${topic}-${partition}`;
    return this.currentOffsets.get(partitionKey) || 0;
  }

  /**
   * Get the log start offset for a partition
   */
  async getLogStartOffset(topic: string, partition: number): Promise<number> {
    // In a real implementation, this would return the oldest available offset
    return 0;
  }

  /**
   * Truncate log to a specific offset
   */
  async truncate(topic: string, partition: number, offset: number): Promise<void> {
    const partitionKey = `${topic}-${partition}`;
    this.currentOffsets.set(partitionKey, offset);
    console.log(`Truncated ${topic}-${partition} to offset ${offset}`);
  }

  /**
   * Delete log segments older than retention policy
   */
  async cleanupOldSegments(topic: string, partition: number, retentionMs: number): Promise<void> {
    const partitionKey = `${topic}-${partition}`;
    const segments = this.segments.get(partitionKey) || [];
    const now = Date.now();

    const segmentsToDelete = segments.filter(
      segment => now - segment.createdAt > retentionMs
    );

    for (const segment of segmentsToDelete) {
      // Delete segment files
      await this.deleteSegment(segment);
    }

    // Update segments list
    const remainingSegments = segments.filter(
      segment => now - segment.createdAt <= retentionMs
    );
    this.segments.set(partitionKey, remainingSegments);

    console.log(`Cleaned up ${segmentsToDelete.length} old segments for ${partitionKey}`);
  }

  /**
   * Create a new log segment
   */
  private async createSegment(topic: string, partition: number, baseOffset: number): Promise<LogSegment> {
    const logDir = this.config.logDirs[0];
    const partitionDir = path.join(logDir, `${topic}-${partition}`);
    await fs.mkdir(partitionDir, { recursive: true });

    const segment: LogSegment = {
      baseOffset,
      filePath: path.join(partitionDir, `${baseOffset.toString().padStart(20, '0')}.log`),
      indexPath: path.join(partitionDir, `${baseOffset.toString().padStart(20, '0')}.index`),
      size: 0,
      createdAt: Date.now(),
    };

    return segment;
  }

  /**
   * Delete a log segment
   */
  private async deleteSegment(segment: LogSegment): Promise<void> {
    try {
      await fs.unlink(segment.filePath);
      await fs.unlink(segment.indexPath);
    } catch (error) {
      console.error(`Failed to delete segment ${segment.filePath}:`, error);
    }
  }

  /**
   * Compact log (for compacted topics)
   */
  async compact(topic: string, partition: number): Promise<void> {
    // In a real implementation, this would:
    // 1. Read all segments
    // 2. Keep only the latest value for each key
    // 3. Write compacted segments
    console.log(`Compacting ${topic}-${partition}`);
  }
}
