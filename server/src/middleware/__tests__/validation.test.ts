/**
 * Tests for validation middleware
 */

import { validateRequest } from '../validation';
import {
  requestFactory,
  responseFactory,
  nextFactory,
} from '../../../../tests/factories/requestFactory';

describe('Validation Middleware', () => {
  describe('validateRequest', () => {
    describe('required fields', () => {
      it('should pass when required field is present', () => {
        const schema = { name: { required: true } };
        const req = requestFactory({ body: { name: 'Test' } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should reject when required field is missing', () => {
        const schema = { name: { required: true } };
        const req = requestFactory({ body: {} });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Missing required field: name',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject when required field is null', () => {
        const schema = { name: { required: true } };
        const req = requestFactory({ body: { name: null } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject when required field is empty string', () => {
        const schema = { name: { required: true } };
        const req = requestFactory({ body: { name: '' } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('minLength validation', () => {
      it('should pass when string meets minLength', () => {
        const schema = { password: { minLength: 8 } };
        const req = requestFactory({ body: { password: 'longpassword' } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should reject when string is too short', () => {
        const schema = { password: { minLength: 8 } };
        const req = requestFactory({ body: { password: 'short' } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'password must be at least 8 characters',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('maxLength validation', () => {
      it('should pass when string is within maxLength', () => {
        const schema = { username: { maxLength: 20 } };
        const req = requestFactory({ body: { username: 'validuser' } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should reject when string exceeds maxLength', () => {
        const schema = { username: { maxLength: 10 } };
        const req = requestFactory({
          body: { username: 'verylongusernameexceeding' },
        });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'username must be at most 10 characters',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('URI format validation', () => {
      it('should pass for valid URI', () => {
        const schema = { website: { format: 'uri' } };
        const req = requestFactory({
          body: { website: 'https://example.com' },
        });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should reject invalid URI', () => {
        const schema = { website: { format: 'uri' } };
        const req = requestFactory({ body: { website: 'not-a-valid-uri' } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'website must be a valid URI',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('pattern validation', () => {
      it('should pass when value matches pattern', () => {
        const schema = { code: { pattern: '^[A-Z]{3}$' } };
        const req = requestFactory({ body: { code: 'ABC' } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should reject when value does not match pattern', () => {
        const schema = { code: { pattern: '^[A-Z]{3}$' } };
        const req = requestFactory({ body: { code: 'abc123' } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'code invalid format' });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('combined validations', () => {
      it('should validate multiple fields', () => {
        const schema = {
          username: { required: true, minLength: 3, maxLength: 20 },
          email: { required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
        };
        const req = requestFactory({
          body: { username: 'testuser', email: 'test@example.com' },
        });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should fail on first invalid field', () => {
        const schema = {
          username: { required: true },
          email: { required: true },
        };
        const req = requestFactory({ body: { email: 'test@example.com' } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Missing required field: username',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle empty body', () => {
        const schema = { optional: { minLength: 1 } };
        const req = requestFactory({ body: undefined });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should handle non-string values for string validations', () => {
        const schema = { count: { minLength: 1 } };
        const req = requestFactory({ body: { count: 123 } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should handle empty schema', () => {
        const schema = {};
        const req = requestFactory({ body: { anything: 'goes' } });
        const res = responseFactory();
        const next = nextFactory();

        const middleware = validateRequest(schema);
        middleware(req as any, res, next);

        expect(next).toHaveBeenCalled();
      });
    });
  });
});
