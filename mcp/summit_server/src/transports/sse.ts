import type { Writable } from 'stream';

export type SseEvent = {
  id?: string;
  event: string;
  data: string;
};

export const formatSseEvent = (event: SseEvent): string => {
  const lines = [`event: ${event.event}`];
  if (event.id) {
    lines.push(`id: ${event.id}`);
  }
  event.data
    .split('\n')
    .forEach((line) => lines.push(`data: ${line}`));
  lines.push('');
  return `${lines.join('\n')}\n`;
};

export class SseEmitter {
  private writable: Writable;
  private maxBytesPerEvent: number;

  constructor(writable: Writable, maxBytesPerEvent = 16_384) {
    this.writable = writable;
    this.maxBytesPerEvent = maxBytesPerEvent;
  }

  async send(event: SseEvent): Promise<void> {
    const payload = formatSseEvent(event);
    const size = Buffer.byteLength(payload, 'utf-8');
    if (size > this.maxBytesPerEvent) {
      throw new Error('SSE event exceeds max bytes per event');
    }
    if (!this.writable.write(payload)) {
      await new Promise<void>((resolve) => {
        this.writable.once('drain', () => resolve());
      });
    }
  }
}
