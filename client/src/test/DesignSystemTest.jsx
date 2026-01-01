// Test file to verify all design system improvements work together
// This file can be used to quickly check that all components are working properly

import React from 'react';

// Import all the major components we've enhanced
import { 
  // Core providers
  DesignSystemProvider,
  AccessibilityProvider,
  FeedbackProvider,
  ResponsiveProvider,
  
  // Layout components
  PageShell,
  
  // Feedback components
  Alert,
  ErrorBoundary,
  LoadingSpinner,
  LoadingBackdrop,
  ProgressBar,
  
  // Utilities
  useFeedback,
  useAccessibility,
  useResponsive,
  
  // Accessibility utilities
  focusFirstElement,
  trapFocus,
  liveAnnouncer,
  srOnlyStyle,
  focusVisibleStyle,
  
  // Responsive utilities
  BREAKPOINTS,
  mediaQuery,
  responsiveSpacing,
  responsiveTypography,
  getCurrentDeviceType,
  isMobile,
  isTablet,
  isDesktop
} from '../design-system';

console.log('Design System Test:');
console.log('All components imported successfully');

// Test that utility functions are available
console.log('Breakpoints:', BREAKPOINTS);
console.log('Current device type:', getCurrentDeviceType());
console.log('Is mobile:', isMobile());
console.log('Is tablet:', isTablet());
console.log('Is desktop:', isDesktop());

// Example of how to use the components together
const DesignSystemTest = () => {
  return (
    <DesignSystemProvider>
      <AccessibilityProvider>
        <ResponsiveProvider>
          <FeedbackProvider>
            <PageShell title="Design System Test">
              <div style={{ padding: '2rem' }}>
                <h1>Design System Integration Test</h1>
                <p>This page tests that all the design system components work together.</p>
                
                <Alert severity="success" title="System Status">
                  All design system components are loaded and ready.
                </Alert>
                
                <div style={{ marginTop: '2rem' }}>
                  <h2>Loading States</h2>
                  <LoadingSpinner />
                  <ProgressBar value={75} variant="determinate" />
                </div>
              </div>
            </PageShell>
          </FeedbackProvider>
        </ResponsiveProvider>
      </AccessibilityProvider>
    </DesignSystemProvider>
  );
};

// Also test the hooks
const TestHooks = () => {
  const { addNotification } = useFeedback();
  const { keyboardNavigation } = useAccessibility();
  const { isMobile: _isMobile } = useResponsive();

  console.log('Hooks are accessible');
  console.log('Keyboard navigation:', keyboardNavigation);
  console.log('Is mobile (from hook):', _isMobile);

  return (
    <button onClick={() => addNotification('Hook test notification', 'info')}>
      Test Hook
    </button>
  );
};

export { DesignSystemTest, TestHooks };