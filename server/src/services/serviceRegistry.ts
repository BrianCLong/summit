// NOTE: This is a mock implementation for development purposes.
const services: Record<string, { healthUrl: string }> = {
  'test-service-1': {
    healthUrl: 'http://localhost:4001/health',
  },
  'test-service-2': {
    healthUrl: 'http://localhost:4002/health',
  },
};

export class MockServiceRegistry {
  getServiceHealthUrl(serviceName: string): string | undefined {
    return services[serviceName]?.healthUrl;
  }
}
