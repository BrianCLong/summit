import '@testing-library/jest-dom';

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      status: 'healthy',
      environment: 'test',
      services: {
        neo4j: 'connected',
        postgres: 'connected',
        redis: 'connected',
      },
    }),
  })
);

// Mock import.meta
global.import_meta = {
  env: {
    VITE_API_URL: 'http://localhost:4000', // Provide a dummy URL
  },
};

// Conditionally mock OnboardingTour for Jest
if (typeof jest !== 'undefined') {
  jest.mock('./components/onboarding/OnboardingTour', () => () => <div data-testid="mock-onboarding-tour" />);
}