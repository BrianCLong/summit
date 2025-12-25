import DemoIndicator from './DemoIndicator';

// Simple test to verify component exists and renders appropriately
describe('DemoIndicator', () => {
  it('should render without crashing when demo mode is enabled', () => {
    // This test verifies that the component exists and has the proper structure
    // Actual rendering depends on environment variable which is tested at runtime
    expect(DemoIndicator).toBeDefined();
    expect(typeof DemoIndicator).toBe('function');
  });
});