import Fastify from 'fastify';
import { ReceiptSigner, SignRequest, SignedPayload } from './signer';

export function createSignerApp(signer = new ReceiptSigner()) {
  const app = Fastify({
    logger: { level: 'info', name: 'receipt-signer' },
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/keys/:keyId', async () => ({
    keyId: signer instanceof ReceiptSigner ? 'kms-default' : 'external',
    publicKey: signer.getPublicKey(),
  }));

  app.post<{ Body: SignRequest }>('/sign', async (req, reply) => {
    if (!req.body?.payload) {
      reply.status(400).send({ error: 'payload is required' });
      return;
    }

    const signature = signer.signPayload(req.body.payload, req.body.keyId);
    reply.send({ signature });
  });

  app.post<{
    Body: { payload: string; signature: SignedPayload };
  }>('/verify', async (req, reply) => {
    const { payload, signature } = req.body || {};

    if (!payload || !signature) {
      reply.status(400).send({ error: 'payload and signature are required' });
      return;
    }

    const valid = signer.verify(payload, signature);
    reply.send({ valid });
  });

  return app;
}

if (require.main === module) {
  const app = createSignerApp();
  const port = process.env.PORT ? Number(process.env.PORT) : 3900;
  app.listen({ port, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}

export type { SignedPayload };
