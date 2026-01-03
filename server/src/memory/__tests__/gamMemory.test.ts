import { createPage } from '../repositories/pageRepository';
import { createSession, getSessionById } from '../repositories/sessionRepository';
import { HybridIndex, embedText } from '../gam/indexers';
import { GamMemorizer } from '../gam/memorizer';
import { Researcher } from '../gam/researcher';

jest.mock('../repositories/pageRepository', () => ({
  createPage: jest.fn(),
}));

jest.mock('../repositories/sessionRepository', () => ({
  createSession: jest.fn(),
  getSessionById: jest.fn(),
}));

const mockCreatePage = createPage as jest.Mock;
const mockCreateSession = createSession as jest.Mock;
const mockGetSessionById = getSessionById as jest.Mock;

describe('GAM memory pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('decorates pages with headers and memo snapshots during ingest', async () => {
    mockCreateSession.mockResolvedValue({ id: 's1', tenant_id: 't1' });
    mockCreatePage.mockResolvedValue({
      id: 'p1',
      session_id: 's1',
      tenant_id: 't1',
      raw_content: {},
    });
    const index = new HybridIndex();
    const memorizer = new GamMemorizer(index, () => true);

    const response = await memorizer.ingest({
      tenantId: 't1',
      agentId: 'a1',
      description: 'demo session',
      turns: [
        { role: 'user', content: 'hello world' },
        { role: 'assistant', content: 'acknowledged' },
      ],
    });

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', agentId: 'a1', description: 'demo session' }),
    );
    expect(mockCreatePage).toHaveBeenCalled();
    const rawContent = mockCreatePage.mock.calls[0][0].rawContent;
    expect(rawContent.header.memoSnapshot).toContain('user: hello world');
    expect(response.pages).toHaveLength(2);
  });

  it('enforces budgets in researcher loop', async () => {
    const index = new HybridIndex();
    const page = {
      id: 'p1',
      session_id: 's1',
      tenant_id: 't1',
      raw_content: { text: 'early fact: launch code' },
      memo: 'launch code',
      sequence: 1,
      classification: [],
      policy_tags: [],
      tags: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
    index.addPage(page, 'early fact: launch code', embedText('early fact: launch code'));

    const researcher = new Researcher(index, () => true);
    const context = await researcher.buildContext({
      tenantId: 't1',
      request: 'retrieve the launch code',
      budgets: { maxPages: 1, maxReflectionDepth: 1, maxOutputTokens: 64 },
    });

    expect(context.evidence.length).toBeLessThanOrEqual(1);
    expect(context.reflectionSteps).toBe(1);
    expect(context.executiveSummary.length).toBeLessThanOrEqual(64);
  });

  it('recovers early facts from ingested sessions without dumping all history', async () => {
    mockCreateSession.mockResolvedValue({ id: 's2', tenant_id: 't1' });
    mockCreatePage
      .mockResolvedValueOnce({ id: 'p-early', session_id: 's2', tenant_id: 't1', raw_content: {}, memo: 'early' })
      .mockResolvedValueOnce({ id: 'p-late', session_id: 's2', tenant_id: 't1', raw_content: {}, memo: 'late' });

    const index = new HybridIndex();
    const memorizer = new GamMemorizer(index, () => true);
    const turns = [
      { role: 'user', content: 'important early directive: stay covert' },
      { role: 'assistant', content: 'acknowledged and will stay covert' },
    ];
    await memorizer.ingest({ tenantId: 't1', agentId: 'a1', turns });

    const researcher = new Researcher(index, () => true);
    const context = await researcher.buildContext({
      tenantId: 't1',
      sessionId: 's2',
      request: 'What was the covert directive?',
      budgets: { maxPages: 2, maxReflectionDepth: 2 },
    });

    const evidenceIds = context.evidence.map((e) => e.pageId);
    expect(evidenceIds).toContain('p-early');
    expect(context.keyFacts.join(' ')).toContain('covert');
  });
});
