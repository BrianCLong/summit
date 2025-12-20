/**
 * Network event generators
 */

import type { NetworkFlow, DnsEvent, HttpEvent } from '../schemas/network.js';
import {
  SeededRandom,
  syntheticId,
  syntheticTimestamp,
  syntheticIpv4,
  syntheticInternalIp,
  syntheticDomain,
  syntheticGeo,
} from './utils.js';

export interface NetworkGeneratorConfig {
  rng?: SeededRandom;
  baseTime?: Date;
  tenantId?: string;
}

/** Generate synthetic network flow event */
export function generateNetworkFlow(config: NetworkGeneratorConfig = {}): NetworkFlow {
  const rng = config.rng ?? new SeededRandom();
  const baseTime = config.baseTime ?? new Date();
  const durationMs = rng.int(100, 60000);

  const isOutbound = rng.bool(0.6);
  const srcIp = isOutbound ? syntheticInternalIp(rng) : syntheticIpv4(rng);
  const dstIp = isOutbound ? syntheticIpv4(rng) : syntheticInternalIp(rng);

  return {
    id: syntheticId(),
    timestamp: syntheticTimestamp(baseTime),
    eventType: 'network.flow',
    source: { ip: srcIp, port: rng.int(1024, 65535) },
    tenantId: config.tenantId,
    classification: 'internal',
    retentionPolicy: 'standard',
    isSynthetic: true,
    destination: { ip: dstIp, port: rng.pick([80, 443, 22, 3389, 8080, 8443]) },
    protocol: rng.pick(['tcp', 'udp']),
    direction: isOutbound ? 'outbound' : 'inbound',
    bytesIn: rng.int(100, 1000000),
    bytesOut: rng.int(100, 1000000),
    packetsIn: rng.int(10, 10000),
    packetsOut: rng.int(10, 10000),
    durationMs,
    startTime: syntheticTimestamp(baseTime),
    endTime: syntheticTimestamp(baseTime, durationMs),
    action: rng.pick(['allow', 'allow', 'allow', 'deny']),
    sourceGeo: isOutbound ? undefined : syntheticGeo(rng),
    destGeo: isOutbound ? syntheticGeo(rng) : undefined,
  } as NetworkFlow;
}

/** Generate synthetic DNS event */
export function generateDnsEvent(config: NetworkGeneratorConfig = {}): DnsEvent {
  const rng = config.rng ?? new SeededRandom();
  const baseTime = config.baseTime ?? new Date();

  const normalDomains = [
    'www.example.com', 'api.example.com', 'mail.example.org',
    'cdn.example.net', 'auth.example.com', 'static.example.io',
  ];

  // 5% chance of suspicious domain
  const isSuspicious = rng.bool(0.05);
  const queryName = isSuspicious
    ? `${Array.from({ length: 16 }, () => rng.int(0, 35).toString(36)).join('')}.suspicious.example`
    : rng.pick(normalDomains);

  return {
    id: syntheticId(),
    timestamp: syntheticTimestamp(baseTime),
    eventType: 'network.dns',
    source: `dns-resolver-${rng.int(1, 3)}`,
    tenantId: config.tenantId,
    classification: 'internal',
    retentionPolicy: 'standard',
    isSynthetic: true,
    queryName,
    queryType: rng.pick(['A', 'AAAA', 'CNAME', 'MX']),
    responseCode: rng.pick(['NOERROR', 'NOERROR', 'NOERROR', 'NXDOMAIN']),
    resolvedAddresses: [syntheticIpv4(rng)],
    clientAddress: { ip: syntheticInternalIp(rng) },
    queryTimeMs: rng.float(1, 100),
    dgaScore: isSuspicious ? rng.float(0.7, 0.95) : rng.float(0, 0.2),
    isNewlyObserved: isSuspicious,
  };
}

/** Generate synthetic HTTP event */
export function generateHttpEvent(config: NetworkGeneratorConfig = {}): HttpEvent {
  const rng = config.rng ?? new SeededRandom();
  const baseTime = config.baseTime ?? new Date();

  const hosts = ['api.example.com', 'www.example.com', 'cdn.example.net'];
  const paths = ['/api/v1/users', '/api/v1/data', '/login', '/health', '/static/app.js'];
  const host = rng.pick(hosts);

  return {
    id: syntheticId(),
    timestamp: syntheticTimestamp(baseTime),
    eventType: 'network.http',
    source: `proxy-${rng.int(1, 3)}`,
    tenantId: config.tenantId,
    classification: 'internal',
    retentionPolicy: 'standard',
    isSynthetic: true,
    method: rng.pick(['GET', 'GET', 'GET', 'POST', 'PUT']),
    url: `https://${host}${rng.pick(paths)}`,
    host,
    path: rng.pick(paths),
    statusCode: rng.pick([200, 200, 200, 201, 301, 400, 401, 403, 404, 500]),
    requestSize: rng.int(100, 10000),
    responseSize: rng.int(100, 100000),
    userAgent: 'Mozilla/5.0 (Synthetic; Example) AppleWebKit/537.36',
    clientAddress: { ip: syntheticInternalIp(rng) },
    serverAddress: { ip: syntheticIpv4(rng), port: 443 },
    tlsVersion: 'TLSv1.3',
    latencyMs: rng.float(10, 500),
  };
}

/** Generate batch of network events */
export function generateNetworkBatch(
  count: number,
  config: NetworkGeneratorConfig = {}
): Array<NetworkFlow | DnsEvent | HttpEvent> {
  const rng = config.rng ?? new SeededRandom();
  const events: Array<NetworkFlow | DnsEvent | HttpEvent> = [];

  for (let i = 0; i < count; i++) {
    const eventType = rng.pick(['flow', 'flow', 'dns', 'http']);
    const baseTime = new Date(Date.now() - rng.int(0, 3600000));

    switch (eventType) {
      case 'flow':
        events.push(generateNetworkFlow({ ...config, rng, baseTime }));
        break;
      case 'dns':
        events.push(generateDnsEvent({ ...config, rng, baseTime }));
        break;
      case 'http':
        events.push(generateHttpEvent({ ...config, rng, baseTime }));
        break;
    }
  }

  return events;
}
