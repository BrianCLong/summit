/**
 * Request Factory
 *
 * Generates test HTTP request objects for middleware testing
 */
import { randomUUID } from 'crypto';
/**
 * Create a mock HTTP request for testing
 */
export function requestFactory(options = {}) {
    const requestId = randomUUID();
    return {
        id: requestId,
        headers: {
            'content-type': 'application/json',
            'user-agent': 'IntelGraph-Test/1.0',
            'x-request-id': requestId,
            ...options.headers,
        },
        body: options.body || {},
        query: options.query || {},
        params: options.params || {},
        user: options.user,
        tenant: options.tenant,
        cookies: options.cookies || {},
        ip: options.ip || '127.0.0.1',
        method: options.method || 'GET',
        url: options.url || '/',
        path: options.path || '/',
        get: function (name) {
            return this.headers[name.toLowerCase()];
        },
    };
}
/**
 * Create a mock HTTP response for testing
 */
export function responseFactory() {
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        setHeader: jest.fn(function (name, value) {
            this.headers[name] = value;
            return this;
        }),
        getHeader: jest.fn(function (name) {
            return this.headers[name];
        }),
        end: jest.fn(),
    };
    return res;
}
/**
 * Create a next function for middleware testing
 */
export function nextFactory() {
    return jest.fn();
}
/**
 * Create an authenticated request
 */
export function authenticatedRequestFactory(user, options = {}) {
    return requestFactory({
        ...options,
        user,
        headers: {
            authorization: `Bearer test-token-${user.id}`,
            ...options.headers,
        },
    });
}
/**
 * Create a GraphQL request
 */
export function graphqlRequestFactory(query, variables = {}, options = {}) {
    return requestFactory({
        ...options,
        method: 'POST',
        url: '/graphql',
        path: '/graphql',
        body: {
            query,
            variables,
        },
    });
}
//# sourceMappingURL=requestFactory.js.map