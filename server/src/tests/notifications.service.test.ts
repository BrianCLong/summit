import { mapNotification } from '../services/NotificationDispatcher';
import type { NotificationRecord } from '../db/repositories/notifications';

describe('NotificationDispatcher', () => {
  it('maps persisted notifications into GraphQL payloads', () => {
    const record: NotificationRecord = {
      id: 'notif-1',
      user_id: 'user-1',
      event_type: 'INGESTION_COMPLETE',
      title: 'Pipeline finished',
      message: 'Dataset processed successfully',
      severity: 'SUCCESS',
      status: 'unread',
      metadata: { ingestionId: 'ing-1' },
      action_id: null,
      investigation_id: 'INV-1',
      expires_at: null,
      read_at: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    } as NotificationRecord;

    const payload = mapNotification(record);

    expect(payload).toEqual({
      id: 'notif-1',
      type: 'INGESTION_COMPLETE',
      title: 'Pipeline finished',
      message: 'Dataset processed successfully',
      severity: 'success',
      timestamp: '2024-01-01T00:00:00.000Z',
      actionId: null,
      investigationId: 'INV-1',
      metadata: { ingestionId: 'ing-1' },
      expiresAt: null,
      readAt: null,
      status: 'unread',
    });
  });
});
