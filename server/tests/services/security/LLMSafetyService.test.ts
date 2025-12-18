import { jest } from '@jest/globals';
import { LLMSafetyService } from '../../../src/services/security/LLMSafetyService.js';
import { PolicyService } from '../../../src/services/security/PolicyService.js';
import { AuditService } from '../../../src/services/security/AuditService.js';

// Mock PolicyService and AuditService
jest.mock('../../../src/services/security/PolicyService.js');
jest.mock('../../../src/services/security/AuditService.js');

// Mock ClassificationEngine
const mockClassify = jest.fn();
jest.mock('../../../src/pii/classifier.js', () => ({
  ClassificationEngine: jest.fn().mockImplementation(() => ({
    classify: mockClassify
  }))
}));

describe('LLMSafetyService', () => {
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should block if policy denies', async () => {
    (PolicyService.evaluate as jest.Mock).mockResolvedValue({ allow: false, reason: 'Denied' });

    await expect(LLMSafetyService.sanitizePrompt('hello', mockUser))
      .rejects.toThrow('LLM Prompt blocked: Denied');
  });

  it('should pass through safe prompt', async () => {
    (PolicyService.evaluate as jest.Mock).mockResolvedValue({ allow: true });
    mockClassify.mockResolvedValue({ entities: [] });

    const result = await LLMSafetyService.sanitizePrompt('hello', mockUser);
    expect(result.safePrompt).toBe('hello');
    expect(result.redacted).toBe(false);
  });

  it('should redact sensitive entities', async () => {
    (PolicyService.evaluate as jest.Mock).mockResolvedValue({ allow: true });

    // "Call me at 555-0199"
    // 555-0199 is at index 11
    mockClassify.mockResolvedValue({
      entities: [
        { type: 'phoneNumber', severity: 'high', start: 11, end: 19 }
      ]
    });

    const result = await LLMSafetyService.sanitizePrompt('Call me at 555-0199', mockUser);
    expect(result.safePrompt).toBe('Call me at [REDACTED:phoneNumber]');
    expect(result.redacted).toBe(true);
    expect(AuditService.log).toHaveBeenCalled();
  });
});
