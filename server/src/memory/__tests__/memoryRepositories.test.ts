import { jest } from '@jest/globals';
import { ValidationError, NotFoundError } from '../../errors/ErrorHandlingFramework';
import { createSession, getSessionById } from '../repositories/sessionRepository';
import { createPage, listPagesForSession, toPgVector } from '../repositories/pageRepository';
import { createEvent, listEventsForPage } from '../repositories/eventRepository';
import { pg } from '../../db/pg';

jest.mock('../../db/pg', () => {
  const write = jest.fn();
  const readMany = jest.fn();
  const oneOrNone = jest.fn();
  return { pg: { write, readMany, oneOrNone } };
});

const mockPg = pg as unknown as {
  write: jest.Mock;
  readMany: jest.Mock;
  oneOrNone: jest.Mock;
};

describe('memory repositories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sessions', () => {
    it('throws when tenantId missing', async () => {
      await expect(createSession({ tenantId: '' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('creates a session with scoped metadata', async () => {
      const inserted = { id: 's1', tenant_id: 't1', status: 'active' } as any;
      mockPg.write.mockResolvedValue(inserted);

      const session = await createSession({
        tenantId: 't1',
        projectId: 'p1',
        title: 'Demo',
        classification: ['public'],
      });

      expect(session).toEqual(inserted);
      expect(mockPg.write).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO memory_sessions'),
        expect.arrayContaining(['t1', 'p1', null, ['public']]),
        { tenantId: 't1' },
      );
    });

    it('gets a session scoped by tenant', async () => {
      const row = { id: 's1', tenant_id: 't1' };
      mockPg.oneOrNone.mockResolvedValue(row);

      const result = await getSessionById('s1', 't1');
      expect(result).toEqual(row);
      expect(mockPg.oneOrNone).toHaveBeenCalledWith(
        expect.stringContaining('FROM memory_sessions'),
        ['s1', 't1'],
        { tenantId: 't1' },
      );
    });

    it('throws NotFoundError when session missing', async () => {
      mockPg.oneOrNone.mockResolvedValue(null);
      await expect(getSessionById('missing', 't1')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('pages', () => {
    const sessionRow = { id: 's1', tenant_id: 't1' };

    it('converts embeddings to vector string', () => {
      expect(toPgVector([1, 2, 3])).toBe('[1,2,3]');
      expect(toPgVector(undefined)).toBeNull();
    });

    it('creates a page with tenant enforcement', async () => {
      mockPg.oneOrNone.mockResolvedValueOnce(sessionRow);
      const inserted = { id: 'p1', session_id: 's1', tenant_id: 't1' };
      mockPg.write.mockResolvedValue(inserted);

      const page = await createPage({
        sessionId: 's1',
        tenantId: 't1',
        sequence: 1,
        rawContent: { text: 'hello' },
        embedding: [0.1, 0.2],
      });

      expect(page).toEqual(inserted);
      expect(mockPg.write).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO memory_pages'),
        expect.arrayContaining([
          's1',
          't1',
          1,
          null,
          { text: 'hello' },
          null,
          null,
          null,
          null,
          null,
          [],
          [],
          [],
          null,
          '[0.1,0.2]',
          {},
        ]),
        { tenantId: 't1' },
      );
    });

    it('lists pages scoped to session', async () => {
      mockPg.oneOrNone.mockResolvedValueOnce(sessionRow);
      mockPg.readMany.mockResolvedValue([{ id: 'p1' }]);

      const pages = await listPagesForSession('s1', 't1');
      expect(pages).toEqual([{ id: 'p1' }]);
      expect(mockPg.readMany).toHaveBeenCalledWith(
        expect.stringContaining('FROM memory_pages'),
        ['s1', 't1'],
        { tenantId: 't1' },
      );
    });
  });

  describe('events', () => {
    const sessionRow = { id: 's1', tenant_id: 't1' };
    const pageRow = { id: 'p1', tenant_id: 't1' };

    it('creates an event with tenant checks', async () => {
      mockPg.oneOrNone
        .mockResolvedValueOnce(sessionRow)
        .mockResolvedValueOnce(pageRow);
      const inserted = { id: 'e1', tenant_id: 't1' };
      mockPg.write.mockResolvedValue(inserted);

      const event = await createEvent({
        pageId: 'p1',
        sessionId: 's1',
        tenantId: 't1',
        sequence: 1,
        type: 'message',
      });

      expect(event).toEqual(inserted);
      expect(mockPg.write).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO memory_events'),
        expect.arrayContaining(['p1', 's1', 't1', 1, 'message']),
        { tenantId: 't1' },
      );
    });

    it('lists events for a page', async () => {
      mockPg.oneOrNone.mockResolvedValueOnce(pageRow);
      mockPg.readMany.mockResolvedValue([{ id: 'e1' }]);

      const events = await listEventsForPage('p1', 't1', { limit: 10 });
      expect(events).toEqual([{ id: 'e1' }]);
      expect(mockPg.readMany).toHaveBeenCalledWith(
        expect.stringContaining('FROM memory_events'),
        ['p1', 't1'],
        { tenantId: 't1' },
      );
    });
  });
});
