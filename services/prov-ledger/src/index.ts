import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ledger, Manifest } from './lib/ledger.js';
import { canonicalize } from './lib/canonical.js';

const PORT = parseInt(process.env.PORT || '4010', 10);

const server = Fastify({
  logger: true,
});

server.register(cors, { origin: true });
server.register(helmet);

server.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, async (_req, body: Buffer) => body);

server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

server.post('/evidence', async (request, reply) => {
  try {
    const contentType = request.headers['content-type'] || 'application/json';
    const body: any = request.body;
    let content: unknown = body;
    if (contentType.includes('application/json') && body && typeof body === 'object' && 'content' in body) {
      content = (body as any).content;
    }
    const record = ledger.addEvidence({
      content: content as any,
      mediaType: contentType,
      attributes: contentType.includes('application/json') && body && typeof body === 'object' ? (body as any).attributes : undefined,
    });
    return reply.status(200).send({ evidenceId: record.id, checksum: record.contentHash, signature: record.signature });
  } catch (error) {
    request.log.error({ error }, 'failed to register evidence');
    return reply.status(400).send({ error: 'invalid evidence payload' });
  }
});

server.post('/claims', async (request, reply) => {
  try {
    const body = request.body as any;
    const evidenceIds: string[] = Array.isArray(body?.evidenceIds) ? body.evidenceIds : [];
    const assertion = body?.assertion || {};
    const actor = body?.actor;
    const claim = ledger.addClaim({ evidenceIds, assertion, actor });
    return reply.status(200).send({ claimId: claim.id, signature: claim.signature });
  } catch (error: any) {
    request.log.error({ error }, 'failed to create claim');
    return reply.status(400).send({ error: error?.message || 'invalid claim payload' });
  }
});

server.get('/manifests/:claimId', async (request, reply) => {
  try {
    const { claimId } = request.params as { claimId: string };
    const manifest = ledger.getManifest(claimId);
    return reply.status(200).send(manifest);
  } catch (error: any) {
    return reply.status(404).send({ error: error?.message || 'manifest not found' });
  }
});

server.post('/verify', async (request, reply) => {
  try {
    const body = request.body as { manifest: Manifest };
    const manifest = body?.manifest || (body as any);
    const result = ledger.verifyManifest(manifest as Manifest);
    return reply.status(200).send(result);
  } catch (error) {
    request.log.error({ error }, 'verification failed');
    return reply.status(400).send({ valid: false, reasons: ['invalid manifest payload'] });
  }
});

server.get('/lineage/:claimId', async (request, reply) => {
  try {
    const { claimId } = request.params as { claimId: string };
    const manifest = ledger.getManifest(claimId);
    return reply.status(200).send({
      claimId,
      adjacency: manifest.adjacency,
      leaves: manifest.leaves.map((leaf) => ({ id: leaf.id, type: leaf.type })),
    });
  } catch (error: any) {
    return reply.status(404).send({ error: error?.message || 'lineage not found' });
  }
});

export function createServer() {
  return server;
}

export function start() {
  return server.listen({ port: PORT, host: '0.0.0.0' });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  start().then(() => {
    server.log.info(`prov-ledger listening on ${PORT}`);
  });
}

export { ledger, canonicalize };
