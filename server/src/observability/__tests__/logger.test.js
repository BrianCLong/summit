"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_js_1 = require("../logging/logger.js");
const context_js_1 = require("../context.js");
const globals_1 = require("@jest/globals");
// Mock the underlying pino logger
globals_1.jest.mock('../../config/logger.js', () => {
    const mockLogger = {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        child: globals_1.jest.fn().mockReturnThis(),
    };
    return {
        logger: mockLogger,
        default: mockLogger,
    };
});
const logger_js_2 = require("../../config/logger.js");
describe('Observability Logger', () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
    });
    it('should log without context', () => {
        logger_js_1.logger.info('test message');
        expect(logger_js_2.logger.info).toHaveBeenCalledWith({}, 'test message');
    });
    it('should inject context into logs', () => {
        context_js_1.context.run({ correlationId: '123', tenantId: 'abc' }, () => {
            logger_js_1.logger.info('contextual message');
            expect(logger_js_2.logger.info).toHaveBeenCalledWith(expect.objectContaining({
                correlationId: '123',
                tenantId: 'abc',
            }), 'contextual message');
        });
    });
    it('should merge user meta with context', () => {
        context_js_1.context.run({ correlationId: '123' }, () => {
            logger_js_1.logger.info('message', { custom: 'data' });
            expect(logger_js_2.logger.info).toHaveBeenCalledWith(expect.objectContaining({
                correlationId: '123',
                custom: 'data',
            }), 'message');
        });
    });
});
