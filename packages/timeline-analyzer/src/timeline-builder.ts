import { ExtractionResult } from '@intelgraph/metadata-extractor';
import { Timeline, TimelineEvent } from './types.js';
import crypto from 'crypto';

/**
 * Timeline builder for constructing timelines from extraction results
 */
export class TimelineBuilder {
  private events: TimelineEvent[] = [];

  /**
   * Add extraction results to the timeline
   */
  addResults(results: ExtractionResult[]): void {
    for (const result of results) {
      this.extractEvents(result);
    }
  }

  /**
   * Build the timeline
   */
  build(): Timeline {
    if (this.events.length === 0) {
      throw new Error('No events to build timeline');
    }

    // Sort events by timestamp
    this.events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const timestamps = this.events.map(e => e.timestamp.getTime());
    const startTime = new Date(Math.min(...timestamps));
    const endTime = new Date(Math.max(...timestamps));

    const artifacts = new Set(this.events.map(e => e.artifactId)).size;
    const sources = Array.from(new Set(this.events.map(e => e.source)));

    return {
      id: this.generateId(),
      events: this.events,
      startTime,
      endTime,
      artifacts,
      sources,
    };
  }

  /**
   * Extract timeline events from an extraction result
   */
  private extractEvents(result: ExtractionResult): void {
    const artifactId = result.id;
    const source = result.base.sourceType;

    // Extract temporal events
    if (result.temporal) {
      if (result.temporal.created) {
        this.events.push({
          id: this.generateEventId(),
          artifactId,
          timestamp: result.temporal.created,
          eventType: 'created',
          source,
          description: `${source} created`,
          confidence: result.base.confidence,
        });
      }

      if (result.temporal.modified) {
        this.events.push({
          id: this.generateEventId(),
          artifactId,
          timestamp: result.temporal.modified,
          eventType: 'modified',
          source,
          description: `${source} modified`,
          confidence: result.base.confidence,
        });
      }

      if (result.temporal.accessed) {
        this.events.push({
          id: this.generateEventId(),
          artifactId,
          timestamp: result.temporal.accessed,
          eventType: 'accessed',
          source,
          description: `${source} accessed`,
          confidence: result.base.confidence,
        });
      }

      if (result.temporal.deleted) {
        this.events.push({
          id: this.generateEventId(),
          artifactId,
          timestamp: result.temporal.deleted,
          eventType: 'deleted',
          source,
          description: `${source} deleted`,
          confidence: result.base.confidence,
        });
      }
    }

    // Extract communication events
    if ((result as any).communication?.email) {
      const email = (result as any).communication.email;
      if (email.date) {
        this.events.push({
          id: this.generateEventId(),
          artifactId,
          timestamp: email.date,
          eventType: 'email_sent',
          source: 'email',
          description: `Email: ${email.subject || '(no subject)'}`,
          confidence: result.base.confidence,
          metadata: {
            from: email.from,
            to: email.to,
            subject: email.subject,
          },
        });
      }
    }

    // Extract network events
    if ((result as any).network?.packets) {
      const packets = (result as any).network.packets;
      for (const packet of packets.slice(0, 100)) {
        // Limit events
        if (packet.timestamp) {
          this.events.push({
            id: this.generateEventId(),
            artifactId,
            timestamp: packet.timestamp,
            eventType: 'network_packet',
            source: 'network',
            description: `${packet.protocol} packet: ${packet.sourceIp} → ${packet.destIp}`,
            confidence: result.base.confidence,
            metadata: packet,
          });
        }
      }
    }
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateEventId(): string {
    return crypto.randomBytes(8).toString('hex');
  }
}
