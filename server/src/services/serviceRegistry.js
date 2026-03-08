"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockServiceRegistry = void 0;
// NOTE: This is a mock implementation for development purposes.
const services = {
    'test-service-1': {
        healthUrl: 'http://localhost:4001/health',
    },
    'test-service-2': {
        healthUrl: 'http://localhost:4002/health',
    },
};
class MockServiceRegistry {
    getServiceHealthUrl(serviceName) {
        return services[serviceName]?.healthUrl;
    }
}
exports.MockServiceRegistry = MockServiceRegistry;
