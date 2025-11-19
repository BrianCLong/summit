import {
  createFetchStreamTransport,
  createSseTransport,
  createSocketIoTransport,
  TransportOpts,
} from './transport';
import type { AssistantTransport } from '@/components/ai-enhanced/EnhancedAIAssistant';

export type Mode = 'fetch' | 'sse' | 'socket';

export function makeAssistantTransport(
  mode: Mode,
  opts: TransportOpts,
): AssistantTransport {
  if (mode === 'sse') return createSseTransport(opts);
  if (mode === 'socket') return createSocketIoTransport(opts);
  return createFetchStreamTransport(opts);
}
