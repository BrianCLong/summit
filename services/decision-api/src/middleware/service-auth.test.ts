import { describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { mintServiceToken, serviceAuthMiddleware, verifyServiceCaller } from './service-auth.js';

describe('service auth verification', () => {
  it('validates a trusted caller with required scopes', async () => {
    const token = await mintServiceToken({
      audience: 'decision-api',
      serviceId: 'intelgraph-jobs',
      scopes: ['decision:write'],
    });
    const principal = await verifyServiceCaller(token);
    expect(principal.serviceId).toBe('intelgraph-jobs');
    expect(principal.scopes).toContain('decision:write');
  });

  it('rejects missing scope', async () => {
    const token = await mintServiceToken({
      audience: 'decision-api',
      serviceId: 'intelgraph-jobs',
      scopes: ['other:scope'],
    });
    await expect(verifyServiceCaller(token)).rejects.toThrow(
      /missing_scope:decision:write/,
    );
  });

  it('rejects unknown service', async () => {
    const token = await mintServiceToken({
      audience: 'decision-api',
      serviceId: 'rogue-service',
      scopes: ['decision:write'],
    });
    await expect(verifyServiceCaller(token)).rejects.toThrow(/unknown_service/);
  });
});

describe('service auth middleware', () => {
  const buildReply = () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    return { status, send } as unknown as FastifyReply;
  };

  it('attaches principal to the request', async () => {
    const token = await mintServiceToken({
      audience: 'decision-api',
      serviceId: 'intelgraph-jobs',
      scopes: ['decision:write'],
    });

    const request = {
      url: '/api/v1/decisions',
      headers: { 'x-service-token': token },
      log: { info: vi.fn(), warn: vi.fn() },
    } as unknown as FastifyRequest;

    const reply = buildReply();
    await serviceAuthMiddleware(request, reply);

    expect((request as any).servicePrincipal?.serviceId).toBe('intelgraph-jobs');
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('rejects invalid token', async () => {
    const request = {
      url: '/api/v1/decisions',
      headers: { 'x-service-token': 'bad-token' },
      log: { info: vi.fn(), warn: vi.fn() },
    } as unknown as FastifyRequest;
    const reply = buildReply();

    await serviceAuthMiddleware(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });
});
