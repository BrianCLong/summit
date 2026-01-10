import { mapErrorToResponse } from '../errors';

describe('mapErrorToResponse', () => {
  it('returns stable validation error mapping', () => {
    const error = new Error('payload invalid');
    (error as any).code = 'VALIDATION_ERROR';

    const mapped = mapErrorToResponse(error);

    expect(mapped).toEqual({
      code: 'VALIDATION_ERROR',
      httpStatus: 400,
      message: 'payload invalid',
      details: undefined,
    });
  });

  it('derives error codes from HTTP status when not explicitly provided', () => {
    const notFoundError = { message: 'missing', status: 404 };
    const mapped = mapErrorToResponse(notFoundError);

    expect(mapped.code).toBe('NOT_FOUND');
    expect(mapped.httpStatus).toBe(404);
    expect(mapped.message).toBe('missing');
  });

  it('maps upstream failures to dependency failure and preserves status', () => {
    const gatewayError = { message: 'upstream unavailable', status: 503 };
    const mapped = mapErrorToResponse(gatewayError);

    expect(mapped.code).toBe('DEPENDENCY_FAILURE');
    expect(mapped.httpStatus).toBe(503);
    expect(mapped.message).toBe('upstream unavailable');
  });
});
