import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Qwen3TTSProvider } from '../services/voice/providers/Qwen3TTSProvider.ts';
import { SpeechJob } from '../services/voice/types.ts';
import { logger } from '../config/logger.ts';

export class VoiceGateway {
  private wss: WebSocketServer;
  private provider: Qwen3TTSProvider;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.provider = new Qwen3TTSProvider();
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      logger.info('Voice Gateway: New connection');

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          // Expecting a SpeechJob
          if (message.type === 'speak' && message.job) {
             const job = message.job as SpeechJob;
             await this.handleSpeak(ws, job);
          } else {
             ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
          }
        } catch (error: any) {
          logger.error({ error }, 'Voice Gateway: Error processing message');
          ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
      });

      ws.on('close', () => {
        logger.info('Voice Gateway: Connection closed');
      });
    });
  }

  private async handleSpeak(ws: WebSocket, job: SpeechJob) {
    await this.provider.streamSpeak(job, {
      onAudio: (chunk, provenance) => {
        if (ws.readyState === WebSocket.OPEN) {
            // Send binary frame or JSON with base64?
            // User asked for "audio frames + provenance manifest events"
            // We'll send a JSON envelope for now for simplicity and metadata
            ws.send(JSON.stringify({
                type: 'audio_chunk',
                audio: chunk.toString('base64'),
                provenance
            }));
        }
      },
      onError: (error) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
      },
      onComplete: () => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'complete' }));
        }
      }
    });
  }
}
