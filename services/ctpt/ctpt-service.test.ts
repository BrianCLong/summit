import {
  CanaryTokenPlantingTracebackService,
  DefaultLeakScoringModel,
} from './ctpt-service';
import { InMemoryWebhookDispatcher } from './webhook-dispatcher';
import { CallbackEvent, PlantHoneytokenInput } from './types';

describe('CanaryTokenPlantingTracebackService', () => {
  const baseInput: PlantHoneytokenInput = {
    type: 'email',
    plantedBy: 'alice',
    sourceSystem: 'crm',
    tags: ['pilot'],
    ttlSeconds: 3600,
  };

  const createService = () => {
    let currentTime = new Date('2025-01-01T00:00:00Z');
    const dispatcher = new InMemoryWebhookDispatcher();
    const events: any[] = [];
    dispatcher.addListener((payload) => {
      events.push(payload);
    });
    const service = new CanaryTokenPlantingTracebackService({
      now: () => currentTime,
      idFactory: (() => {
        let counter = 0;
        return () => `id-${++counter}`;
      })(),
      webhookDispatcher: dispatcher,
      leakScoringModel: new DefaultLeakScoringModel(),
    });
    return { service, dispatcher, events, advance: (minutes: number) => {
      currentTime = new Date(currentTime.getTime() + minutes * 60000);
    } };
  };

  it('plants tokens with source attribution and TTL', () => {
    const { service } = createService();
    const token = service.plantToken(baseInput);
    expect(token.sourceSystem).toBe('crm');
    expect(token.expiresAt.getTime()).toBe(token.createdAt.getTime() + 3600 * 1000);
    expect(token.tokenValue).toContain('alerts+id-1');
  });

  it('records callbacks and returns attribution results', () => {
    const { service } = createService();
    const token = service.plantToken(baseInput);
    const event: CallbackEvent = {
      tokenValue: token.tokenValue,
      channel: 'http-callback',
      sourceAddress: '198.51.100.5',
      context: { userAgent: 'curl/8.0' },
    };
    const attribution = service.recordCallback(event);
    expect(attribution).not.toBeNull();
    expect(attribution?.token.id).toBe(token.id);
    expect(attribution?.confidence).toBeGreaterThan(0.6);
    expect(attribution?.token.leakScore).toBeGreaterThan(0);
  });

  it('suppresses callbacks once TTL has elapsed', () => {
    const { service, advance } = createService();
    const token = service.plantToken({ ...baseInput, ttlSeconds: 60 });
    advance(120);
    const event: CallbackEvent = {
      tokenValue: token.tokenValue,
      channel: 'keyword-scan',
    };
    const attribution = service.recordCallback(event);
    expect(attribution).toBeNull();
  });

  it('builds dashboards with leak ordering and activity', () => {
    const { service, advance } = createService();
    const high = service.plantToken({ ...baseInput, tags: ['high-sensitivity'] });
    const low = service.plantToken({ ...baseInput, type: 'unique-phrase', tags: [] });

    service.recordCallback({ tokenValue: low.tokenValue, channel: 'keyword-scan' });
    advance(1);
    service.recordCallback({ tokenValue: high.tokenValue, channel: 'http-callback' });

    const dashboard = service.getDashboard();
    expect(dashboard.totals.planted).toBe(2);
    expect(dashboard.tokensByType['email']).toBe(1);
    expect(dashboard.tokensByType['unique-phrase']).toBe(1);
    expect(dashboard.topAlerts[0].tokenId).toBe(high.id);
    expect(dashboard.recentActivity[0].tokenId).toBe(high.id);
  });

  it('dispatches compact incident webhooks', () => {
    const { service, events } = createService();
    const token = service.plantToken({ ...baseInput, tags: ['high-sensitivity'] });
    service.recordCallback({ tokenValue: token.tokenValue, channel: 'inbox-hit' });
    expect(events).toHaveLength(1);
    const payload = events[0];
    expect(payload).toMatchObject({
      tokenId: token.id,
      tokenType: token.type,
      tokenDisplayName: token.displayName,
      channel: 'inbox-hit',
    });
    expect(Object.keys(payload)).toEqual([
      'incidentId',
      'tokenId',
      'tokenType',
      'tokenDisplayName',
      'leakScore',
      'sourceSystem',
      'channel',
      'observedAt',
      'confidence',
      'tags',
    ]);
  });
});
