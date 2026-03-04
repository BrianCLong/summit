import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { sanitizeInput } from '../sanitization';

describe('Sanitization Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {};
        nextFunction = jest.fn();
    });

    it('should remove keys starting with $ or .', () => {
        mockRequest.body = {
            valid: 'key',
            $invalid: 'nosql',
            nested: {
                '.invalid': 'nosql',
                alsoValid: 123
            }
        };

        sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockRequest.body).toEqual({
            valid: 'key',
            nested: {
                alsoValid: 123
            }
        });
        expect(nextFunction).toHaveBeenCalled();
    });

    it('should maintain reference equality if no keys are removed (Copy-on-Write)', () => {
        const cleanBody = {
            a: 1,
            b: [1, 2, 3],
            c: { d: 'e' }
        };
        mockRequest.body = cleanBody;

        sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockRequest.body).toBe(cleanBody);
        expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle arrays correctly', () => {
        const dirtyArray = [
            { valid: 1 },
            { $invalid: 2 },
            { valid: 3 }
        ];
        mockRequest.body = dirtyArray;

        sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockRequest.body).toEqual([
            { valid: 1 },
            {},
            { valid: 3 }
        ]);
        // The array itself should be a new reference if an item was changed
        expect(mockRequest.body).not.toBe(dirtyArray);
    });

    it('should maintain reference equality for clean arrays', () => {
        const cleanArray = [{ a: 1 }, { b: 2 }];
        mockRequest.body = cleanArray;

        sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockRequest.body).toBe(cleanArray);
    });

    it('should preserve Date, RegExp, and Buffer instances', () => {
        const date = new Date();
        const regex = /test/i;
        const buffer = Buffer.from('hello');

        mockRequest.body = {
            date,
            regex,
            buffer,
            $invalid: 'foo'
        };

        sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockRequest.body.date).toBe(date);
        expect(mockRequest.body.regex).toBe(regex);
        expect(mockRequest.body.buffer).toBe(buffer);
        expect(mockRequest.body.$invalid).toBeUndefined();
    });

    it('should sanitize query and params', () => {
        mockRequest.query = { $where: '1' } as any;
        mockRequest.params = { '.id': '123' } as any;

        sanitizeInput(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockRequest.query).toEqual({});
        expect(mockRequest.params).toEqual({});
    });
});
