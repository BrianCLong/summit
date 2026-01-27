
import { IntentRouterService } from '../../src/services/IntentRouterService';
import { IntentClassificationService, IntentResult } from '../../src/services/IntentClassificationService';
import { GraphRAGQueryService } from '../../src/services/GraphRAGQueryService';

// Mocks
const mockClassify = jest.fn();
const mockQuery = jest.fn();

jest.mock('../../src/services/IntentClassificationService', () => {
  return {
    IntentClassificationService: jest.fn().mockImplementation(() => {
      return {
        classify: mockClassify
      };
    })
  };
});

jest.mock('../../src/services/GraphRAGQueryService', () => {
    return {
        GraphRAGQueryService: jest.fn().mockImplementation(() => {
            return {
                query: mockQuery
            };
        })
    };
});

describe('IntentRouterService', () => {
  let router: IntentRouterService;
  let classifier: IntentClassificationService;
  let ragService: GraphRAGQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    classifier = new IntentClassificationService();
    ragService = new GraphRAGQueryService({} as any, {} as any, {} as any, {} as any, {} as any);
    router = new IntentRouterService(classifier, ragService);
  });

  it('routes to retrieval when intent is retrieval', async () => {
    const intent: IntentResult = {
      primary_intent: 'retrieval',
      confidence: 0.9,
      entities: [],
      freshness_requirement: { requires_live: true }
    };
    mockClassify.mockResolvedValue(intent);
    mockQuery.mockResolvedValue({
        answer: 'This is the answer',
        citations: [],
        confidence: 0.9
    });

    const result = await router.route('What is status?', {});

    expect(mockClassify).toHaveBeenCalledWith('What is status?', {});
    expect(mockQuery).toHaveBeenCalled();
    expect(result.answer).toBe('This is the answer');
    expect(result.freshness_proof?.live_lookup).toBe(true);
  });

  it('routes to clarification when intent is clarification', async () => {
     const intent: IntentResult = {
         primary_intent: 'clarification',
         confidence: 0.9,
         entities: [],
         clarifying_question: 'What do you mean?'
     };
     mockClassify.mockResolvedValue(intent);

     const result = await router.route('Huh?', {});
     expect(mockQuery).not.toHaveBeenCalled();
     expect(result.answer).toBe('What do you mean?');
  });

  it('routes to action when intent is action', async () => {
      const intent: IntentResult = {
          primary_intent: 'action',
          sub_intent: 'cancel',
          confidence: 0.9,
          entities: ['UserX']
      };
      mockClassify.mockResolvedValue(intent);

      const result = await router.route('Cancel UserX', {});
      expect(mockQuery).not.toHaveBeenCalled();
      expect(result.answer).toContain('request to cancel UserX');
  });
});
