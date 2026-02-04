import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';

type LlmSecurityContext = {
  tenantId: string;
  principal: {
    id: string;
    name: string;
    role: string;
  };
  purpose: 'rag' | 'analysis' | 'enrichment' | 'automation' | 'other';
  dataSensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
};

const mockPolicyEvaluate = jest.fn() as jest.Mock<any>;
const mockDlpScanContent = jest.fn() as jest.Mock<any>;
const mockDlpApplyActions = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('../PolicyService.js', () => ({
  policyService: {
    evaluate: mockPolicyEvaluate,
  },
}));

jest.unstable_mockModule('../DLPService.js', () => ({
  dlpService: {
    scanContent: mockDlpScanContent,
    applyActions: mockDlpApplyActions,
  },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('LlmSecurityService', () => {
  let LlmSecurityService: typeof import('../LlmSecurityService.js').LlmSecurityService;
  let service: ReturnType<typeof LlmSecurityService.getInstance>;

  const defaultContext: LlmSecurityContext = {
    tenantId: 'tenant-123',
    principal: {
      id: 'user-456',
      name: 'Test User',
      role: 'analyst',
    },
    purpose: 'analysis',
    dataSensitivity: 'internal',
  };

  beforeAll(async () => {
    ({ LlmSecurityService } = await import('../LlmSecurityService.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (LlmSecurityService as any).instance = null;
    service = LlmSecurityService.getInstance();
  });

  describe('getInstance()', () => {
    it('returns singleton instance', () => {
      const instance1 = LlmSecurityService.getInstance();
      const instance2 = LlmSecurityService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validatePrompt()', () => {
    it('allows prompt when policy approves and no DLP violations', async () => {
      mockPolicyEvaluate.mockResolvedValue({ allow: true });
      mockDlpScanContent.mockResolvedValue([]);
      mockDlpApplyActions.mockResolvedValue({ processedContent: 'test prompt' });

      const result = await service.validatePrompt(
        'Analyze this data',
        defaultContext,
        'gpt-4',
      );

      expect(result.allowed).toBe(true);
      expect(result.redactedPrompt).toBe('test prompt');
    });

    it('denies prompt when policy rejects', async () => {
      mockPolicyEvaluate.mockResolvedValue({
        allow: false,
        reason: 'Model not approved',
      });

      const result = await service.validatePrompt(
        'Analyze this data',
        defaultContext,
        'gpt-4',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Model not approved');
    });

    it('blocks prompt when DLP finds blocking violation', async () => {
      mockPolicyEvaluate.mockResolvedValue({ allow: true });
      mockDlpScanContent.mockResolvedValue([
        {
          matched: true,
          pattern: 'ssn',
          recommendedActions: [{ type: 'block', reason: 'SSN detected' }],
        },
      ]);

      const result = await service.validatePrompt(
        'Patient SSN is 123-45-6789',
        defaultContext,
        'gpt-4',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('DLP violation: prompt contains sensitive data');
    });

    it('allows prompt with redaction when DLP recommends redact', async () => {
      mockPolicyEvaluate.mockResolvedValue({ allow: true });
      mockDlpScanContent.mockResolvedValue([
        {
          matched: true,
          pattern: 'email',
          recommendedActions: [{ type: 'redact' }],
        },
      ]);
      mockDlpApplyActions.mockResolvedValue({
        processedContent: 'Contact [REDACTED] for info',
      });

      const result = await service.validatePrompt(
        'Contact john@example.com for info',
        defaultContext,
        'gpt-4',
      );

      expect(result.allowed).toBe(true);
      expect(result.redactedPrompt).toBe('Contact [REDACTED] for info');
    });

    it('fails closed when DLP scan throws error', async () => {
      mockPolicyEvaluate.mockResolvedValue({ allow: true });
      mockDlpScanContent.mockRejectedValue(new Error('DLP unavailable'));

      const result = await service.validatePrompt(
        'Test prompt',
        defaultContext,
        'gpt-4',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Security check failed');
    });
  });

  describe('validateResponse()', () => {
    it('returns response unchanged', async () => {
      const response = 'The analysis shows positive trends.';
      const result = await service.validateResponse(response, defaultContext);
      expect(result).toBe(response);
    });
  });
});
