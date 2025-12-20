import { EventEmitter } from 'events';

export interface PreviewStreamPayload {
  previewId: string;
  batch: unknown[];
  cursor: string | null;
  nextCursor?: string | null;
  complete?: boolean;
  warnings?: string[];
}

class PreviewStreamHub {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  publish(previewId: string, payload: PreviewStreamPayload): void {
    this.emitter.emit(previewId, payload);
  }

  subscribe(
    previewId: string,
    listener: (payload: PreviewStreamPayload) => void,
  ): () => void {
    this.emitter.on(previewId, listener);
    return () => {
      this.emitter.off(previewId, listener);
    };
  }
}

export const previewStreamHub = new PreviewStreamHub();
