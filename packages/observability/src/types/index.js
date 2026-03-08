"use strict";
/**
 * CompanyOS Observability SDK - Core Types
 *
 * These types define the observability contract that all services must follow.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDACTED_FIELDS = void 0;
/** Fields that must be redacted from logs */
exports.REDACTED_FIELDS = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'sessionId',
    'session_id',
    'creditCard',
    'credit_card',
    'ssn',
    'privateKey',
    'private_key',
];
