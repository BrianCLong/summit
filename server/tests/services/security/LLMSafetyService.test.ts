import { jest } from '@jest/globals';
let LLMSafetyService: typeof import('../../../src/services/security/LLMSafetyService.js').LLMSafetyService;
let PolicyService: typeof import('../../../src/services/security/PolicyService.js').PolicyService;
let AuditService: typeof import('../../../src/services/security/AuditService.js').AuditService;

type ClassificationEntity = {
  type: string;
  severity: string;
  start: number;
  end: number;
};
type ClassificationResult = { entities: ClassificationEntity[] };

// Mock ClassificationEngine
const mockClassify = jest.fn();
const classifyMock = mockClassify as jest.MockedFunction<
  (...args: unknown[]) => Promise<ClassificationResult>
>;

beforeAll(async () => {
  jest.resetModules();
  await jest.unstable_mockModule('../../../src/pii/classifier.js', () => ({
    ClassificationEngine: jest.fn().mockImplementation(() => ({
      classify: mockClassify,
    })),
  }));

  ({ LLMSafetyService } = await import('../../../src/services/security/LLMSafetyService.js'));
  ({ PolicyService } = await import('../../../src/services/security/PolicyService.js'));
  ({ AuditService } = await import('../../../src/services/security/AuditService.js'));
});

describe('LLMSafetyService', () => {
  const mockUser = { id: 'user-1' };
  let evaluateMock: jest.SpiedFunction<typeof PolicyService.evaluate>;
  let auditLogMock: jest.SpiedFunction<typeof AuditService.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    evaluateMock = jest.spyOn(PolicyService, 'evaluate');
    auditLogMock = jest.spyOn(AuditService, 'log').mockResolvedValue();
    (LLMSafetyService as unknown as { classifier: { classify: typeof mockClassify } }).classifier = {
      classify: mockClassify,
    };
  });

  it('should block if policy denies', async () => {
    evaluateMock.mockResolvedValue({ allow: false, reason: 'Denied' });

    await expect(LLMSafetyService.sanitizePrompt('hello', mockUser))
      .rejects.toThrow('LLM Prompt blocked: Denied');
  });

  it('should pass through safe prompt', async () => {
    evaluateMock.mockResolvedValue({ allow: true });
    classifyMock.mockResolvedValue({ entities: [] });

    const result = await LLMSafetyService.sanitizePrompt('hello', mockUser);
    expect(result.safePrompt).toBe('hello');
    expect(result.redacted).toBe(false);
  });

  it('should redact sensitive entities', async () => {
    evaluateMock.mockResolvedValue({ allow: true });

    // "Call me at 555-0199"
    // 555-0199 is at index 11
    classifyMock.mockResolvedValue({
      entities: [
        { type: 'phoneNumber', severity: 'high', start: 11, end: 19 }
      ]
    });

    const result = await LLMSafetyService.sanitizePrompt('Call me at 555-0199', mockUser);
    expect(result.safePrompt).toBe('Call me at [REDACTED:phoneNumber]');
    expect(result.redacted).toBe(true);
    expect(auditLogMock).toHaveBeenCalled();
  });
});
