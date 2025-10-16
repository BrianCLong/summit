import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { context, trace } from '@opentelemetry/api';

let sdk: NodeSDK | null = null;

export async function initTelemetry(serviceName: string) {
  if (sdk) return;
  sdk = new NodeSDK({
    serviceName,
    instrumentations: [getNodeAutoInstrumentations()],
  });
  await sdk.start();
}

export function emitFrame(
  direction: 'in' | 'out',
  channel: 'jsonrpc' | 'sse' | 'stdio',
  attributes: Record<string, unknown> = {},
) {
  const span = trace.getSpan(context.active());
  span?.addEvent('mcp.frame', {
    'mcp.frame.direction': direction,
    'mcp.frame.channel': channel,
    ...attributes,
  });
}
