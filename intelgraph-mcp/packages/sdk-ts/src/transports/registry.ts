import { GrpcTransportClient, GrpcTransportClientOptions } from './grpc-client';
import { HttpTransportClient, HttpTransportClientOptions } from './http-client';
import {
  TransportClient,
  TransportNegotiationOptions,
  TransportSelection,
} from './types';

export type TransportRegistryOptions = TransportNegotiationOptions & {
  http?: HttpTransportClientOptions;
  grpc?: GrpcTransportClientOptions;
};

export async function resolveTransportClient(
  baseUrl: string,
  token: string,
  options: TransportRegistryOptions = {},
): Promise<{ client: TransportClient; selection: TransportSelection }> {
  const transport = options.transport ?? 'http';
  if (transport === 'http') {
    return {
      client: new HttpTransportClient(baseUrl, token, options.http),
      selection: { type: 'http', reason: 'configured' },
    };
  }

  if (transport === 'grpc') {
    return {
      client: new GrpcTransportClient(
        resolveGrpcAddress(baseUrl, options),
        token,
        options.grpc,
      ),
      selection: { type: 'grpc', reason: 'configured' },
    };
  }

  const preferGrpc = options.preferGrpc ?? true;
  if (preferGrpc) {
    const grpcClient = new GrpcTransportClient(
      resolveGrpcAddress(baseUrl, options),
      token,
      options.grpc,
    );
    const healthy = await probeGrpc(grpcClient, options.healthTimeoutMs);
    if (healthy) {
      return {
        client: grpcClient,
        selection: { type: 'grpc', reason: 'probe-success' },
      };
    }
  }

  return {
    client: new HttpTransportClient(baseUrl, token, options.http),
    selection: { type: 'http', reason: 'fallback' },
  };
}

async function probeGrpc(
  client: GrpcTransportClient,
  timeoutMs = 500,
): Promise<boolean> {
  try {
    return await client.ping(timeoutMs);
  } catch (_error) {
    return false;
  }
}

function resolveGrpcAddress(
  baseUrl: string,
  options: TransportNegotiationOptions,
) {
  if (options.grpcAddress) return options.grpcAddress;
  const url = new URL(baseUrl);
  const host = url.hostname;
  const port = options.grpcPort ?? 9090;
  return `${host}:${port}`;
}
