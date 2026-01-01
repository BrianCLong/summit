import React, { useState, useEffect } from 'react';
import { 
  // Main providers
  DesignSystemProvider,
  AccessibilityProvider,
  FeedbackProvider,
  ResponsiveProvider,
  
  // Layout components
  PageShell,
  
  // Data display
  DataTable,
  
  // Feedback components
  Alert,
  ErrorBoundary,
  LoadingSpinner,
  LoadingBackdrop,
  ProgressBar,
  
  // Utilities
  useFeedback,
  useAccessibility,
  useResponsive
} from '../design-system';

// Test component to verify all features work together
const TestPage = () => {
  const { addNotification } = useFeedback();
  const { keyboardNavigation, prefersReducedMotion } = useAccessibility();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [testData, setTestData] = useState([]);
  const [showBackdrop, setShowBackdrop] = useState(false);

  // Mock data for DataTable
  const mockData = [
    { id: 1, name: 'Entity A', type: 'Person', confidence: 0.95, lastUpdated: '2023-01-15' },
    { id: 2, name: 'Organization B', type: 'Organization', confidence: 0.87, lastUpdated: '2023-01-14' },
    { id: 3, name: 'Event C', type: 'Event', confidence: 0.92, lastUpdated: '2023-01-13' },
    { id: 4, name: 'Location D', type: 'Location', confidence: 0.78, lastUpdated: '2023-01-12' },
  ];

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'confidence', label: 'Confidence', sortable: true },
    { key: 'lastUpdated', label: 'Last Updated', sortable: true },
  ];

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setTestData(mockData);
      setLoading(false);
      addNotification('Test page loaded successfully!', 'success');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Simulate progress
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleTestNotification = () => {
    addNotification('Test notification triggered!', 'info');
  };

  const handleShowBackdrop = () => {
    setShowBackdrop(true);
    setTimeout(() => setShowBackdrop(false), 2000);
  };

  return (
    <PageShell title="UI Improvements Test Page">
      <div style={{ padding: '2rem' }}>
        <h1>Summit UI Improvements Test Page</h1>
        
        {/* Device Type Indicator */}
        <div style={{ 
          margin: '1rem 0', 
          padding: '1rem', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '4px' 
        }}>
          <strong>Device Type:</strong> 
          {isMobile && <span> Mobile (≤600px)</span>}
          {isTablet && <span> Tablet (601px - 1279px)</span>}
          {isDesktop && <span> Desktop (≥1280px)</span>}
        </div>

        {/* Accessibility Status */}
        <div style={{ 
          margin: '1rem 0', 
          padding: '1rem', 
          backgroundColor: keyboardNavigation ? '#e3f2fd' : '#f0f0f0', 
          borderRadius: '4px' 
        }}>
          <strong>Keyboard Navigation:</strong> {keyboardNavigation ? 'Active' : 'Not Active'}
          <br />
          <strong>Reduced Motion:</strong> {prefersReducedMotion ? 'Yes' : 'No'}
        </div>

        {/* Test Buttons */}
        <div style={{ margin: '2rem 0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={handleTestNotification}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#2196f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Notification
          </button>
          
          <button 
            onClick={handleShowBackdrop}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#4caf50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Show Loading Backdrop
          </button>
        </div>

        {/* Loading States Test */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <LoadingSpinner size={60} />
            <p>Loading test data...</p>
            <ProgressBar 
              variant="determinate" 
              value={progress} 
              style={{ width: '100%', marginTop: '1rem' }} 
            />
          </div>
        ) : (
          <>
            {/* Alert Test */}
            <Alert 
              severity="info" 
              title="Test Alert"
              style={{ marginBottom: '2rem' }}
            >
              This is a test alert to verify the Alert component is working properly.
            </Alert>

            {/* Data Table Test */}
            <h2>Test Data Table</h2>
            <DataTable 
              data={testData} 
              columns={columns} 
              onSort={(col, dir) => console.log('Sorted by:', col, dir)}
            />

            {/* Responsive Test */}
            <div style={{ 
              marginTop: '2rem', 
              padding: '2rem', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '8px' 
            }}>
              <h3>Responsive Design Test</h3>
              <p>The layout of this section should adapt to different screen sizes.</p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
                gap: '1rem',
                marginTop: '1rem'
              }}>
                <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                  <h4>Column 1</h4>
                  <p>This column adapts to screen size</p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                  <h4>Column 2</h4>
                  <p>This column adapts to screen size</p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '4px' }}>
                  <h4>Column 3</h4>
                  <p>This column adapts to screen size</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Loading Backdrop */}
        <LoadingBackdrop 
          open={showBackdrop} 
          message="Backdrop loading test..." 
        />
      </div>
    </PageShell>
  );
};

// Wrap the test page with all providers to verify integration
const TestPageWithProviders = () => {
  return (
    <DesignSystemProvider>
      <AccessibilityProvider>
        <ResponsiveProvider>
          <FeedbackProvider>
            <ErrorBoundary>
              <TestPage />
            </ErrorBoundary>
          </FeedbackProvider>
        </ResponsiveProvider>
      </AccessibilityProvider>
    </DesignSystemProvider>
  );
};

export default TestPageWithProviders;