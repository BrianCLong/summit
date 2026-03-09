import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { OpaClient, PolicyEvaluationError } from '../governance/opa-client.js';
import { GovernanceAgent } from '../governance/governance-agent.js';
import { FeedbackValidator } from '../governance/feedback-validator.js';

vi.mock('axios');

describe('CompanyOS Governance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('OpaClient', () => {
    it('should evaluate policy via HTTP', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { result: { allow: true } } });

      const client = new OpaClient();
      const result = await client.evaluate('governance.allow', { user: 'test' });
      expect(result.allow).toBe(true);
      expect(axios.post).toHaveBeenCalled();
    });

    it('should retry on network error', async () => {
      vi.mocked(axios.post)
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
        .mockResolvedValueOnce({ data: { result: { allow: false, reason: 'denied' } } });

      const client = new OpaClient();
      const result = await client.evaluate('governance.allow', { user: 'test' });
      expect(result.allow).toBe(false);
      expect(result.reason).toBe('denied');
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('should throw PolicyEvaluationError on persistent failure', async () => {
      vi.mocked(axios.post).mockRejectedValue({ code: 'ECONNREFUSED' });

      const client = new OpaClient();
      await expect(client.evaluate('governance.allow', {})).rejects.toThrow(PolicyEvaluationError);
      expect(axios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('GovernanceAgent', () => {
    it('should enforce policy and log audit event', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { result: { allow: true } } });

      const auditLogger = { log: vi.fn().mockReturnValue('audit-123') };
      const agent = new GovernanceAgent(new OpaClient(), auditLogger);

      const result = await agent.enforce('user-1', 'deploy', 'prod', { env: 'production' });

      expect(result.allowed).toBe(true);
      expect(result.auditId).toBe('audit-123');
      expect(auditLogger.log).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'user-1',
        action: 'deploy',
        outcome: 'success'
      }));
    });
  });

  describe('FeedbackValidator', () => {
    const validator = new FeedbackValidator();

    it('should validate valid feedback', () => {
      const result = validator.validate({
        agentId: 'agent-1',
        action: 'code_review',
        result: 'ok',
        confidence: 0.9
      });
      expect(result.valid).toBe(true);
    });

    it('should report errors for invalid feedback', () => {
      const result = validator.validate({
        agentId: '',
        action: 'unknown_action',
        result: 'fail',
        confidence: 1.5
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('agentId is required');
      expect(result.errors).toContain('confidence must be between 0 and 1');
      expect(result.errors).toContain("action 'unknown_action' is not in allowed set");
    });
  });
});
