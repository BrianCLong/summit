import { randomUUID } from 'crypto';
import { DomainName, RecordTimelineEntry } from './types';
import { Request, Response, NextFunction } from 'express';

export const correctnessCorrelationIdHeader = 'x-correctness-correlation-id';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const existing = req.headers[correctnessCorrelationIdHeader] as string | undefined;
  const correlationId = existing || randomUUID();
  req.headers[correctnessCorrelationIdHeader] = correlationId;
  res.setHeader(correctnessCorrelationIdHeader, correlationId);
  next();
};

export class RecordTimeline {
  private entries: RecordTimelineEntry[] = [];

  record(entry: RecordTimelineEntry) {
    this.entries.push(entry);
  }

  forEntity(domain: DomainName, entityId: string): RecordTimelineEntry[] {
    return this.entries.filter((entry) => entry.domain === domain && entry.entityId === entityId);
  }
}
