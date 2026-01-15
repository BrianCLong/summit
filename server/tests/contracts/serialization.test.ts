import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ContractError, ErrorCode, BaseResponse } from '../../src/contracts/index.js';

describe('Contracts Serialization', () => {
  it('should serialize ContractError correctly', () => {
    const error = new ContractError('Something went wrong', ErrorCode.VALIDATION_ERROR, { field: 'email' });
    const json = error.toJSON();

    expect(json.name).toBe('ContractError');
    expect(json.message).toBe('Something went wrong');
    expect(json.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(json.details).toEqual({ field: 'email' });
    expect(json.timestamp).toBeDefined();
  });

  it('should allow valid BaseResponse structure', () => {
    const response: BaseResponse<string> = {
      success: true,
      data: 'hello',
      metadata: {
        requestId: '123',
        timestamp: '2023-01-01',
        version: '1.0'
      }
    };

    expect(response.success).toBe(true);
    expect(response.data).toBe('hello');
  });
});
