import { EventEmitter } from 'events';
import { normalizeFrame } from './window.js';
import { DataChannelLike, NumericArray, PipelineEvent, SignalProcessor, WebSocketLike } from './types.js';

export interface PipelineOptions {
  sampleRate: number;
  frameSize: number;
  processors: SignalProcessor[];
}

export interface ProcessedFrame {
  frame: Float64Array;
  results: unknown[];
}

export class SignalStreamingPipeline extends EventEmitter {
  private readonly sockets = new Set<WebSocketLike>();

  private readonly channels = new Set<DataChannelLike>();

  constructor(private readonly options: PipelineOptions) {
    super();
  }

  attachWebSocket(socket: WebSocketLike): void {
    this.sockets.add(socket);
    socket.onmessage = (event) => this.handleInbound(event.data);
  }

  attachDataChannel(channel: DataChannelLike): void {
    this.channels.add(channel);
    channel.onmessage = (event) => this.handleInbound(event.data);
  }

  ingestFrame(data: NumericArray): ProcessedFrame {
    const frame = normalizeFrame(data, this.options.frameSize);
    const rawEvent: PipelineEvent<Float64Array> = { type: 'raw', payload: frame, timestamp: Date.now() };
    this.emit('event', rawEvent);

    const results = this.options.processors.map((processor) => processor(frame));
    const processed: ProcessedFrame = { frame, results };
    const processedEvent: PipelineEvent<ProcessedFrame> = { type: 'processed', payload: processed, timestamp: Date.now() };
    this.emit('event', processedEvent);
    this.broadcast(processed);
    return processed;
  }

  shutdown(): void {
    this.sockets.forEach((socket) => socket.close());
    this.channels.forEach((channel) => channel.close());
    this.sockets.clear();
    this.channels.clear();
  }

  private handleInbound(data: any): void {
    const frame = this.decodePayload(data);
    if (frame) {
      this.ingestFrame(frame);
    }
  }

  private normalizeFrame(data: NumericArray): Float64Array {
    return normalizeFrame(data, this.options.frameSize);
  }

  private decodePayload(data: any): Float64Array | null {
    try {
      if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return this.normalizeFrame(Float64Array.from(parsed));
        }
      } else if (data instanceof ArrayBuffer) {
        return this.normalizeFrame(new Float64Array(data));
      } else if (ArrayBuffer.isView(data)) {
        return this.normalizeFrame(new Float64Array((data as ArrayBufferView).buffer));
      }
    } catch {
      // ignore malformed frames
    }
    return null;
  }

  private broadcast(processed: ProcessedFrame): void {
    const payload = JSON.stringify({
      frame: Array.from(processed.frame),
      results: processed.results,
      sampleRate: this.options.sampleRate,
    });
    this.sockets.forEach((socket) => {
      if (socket.readyState === 1) {
        socket.send(payload);
      }
    });
    this.channels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(payload);
      }
    });
  }
}
