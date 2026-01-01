# Summit Design System Quick Start Guide

Get started with the Summit Design System in minutes.

## Installation

The Summit Design System is part of the client application - no additional installation needed.

## Basic Setup

### 1. Setup Providers

First, wrap your application with the required providers:

```jsx
// App.jsx
import React from 'react';
import { 
  DesignSystemProvider, 
  AccessibilityProvider,
  FeedbackProvider,
  ResponsiveProvider 
} from './src/design-system';

function App({ children }) {
  return (
    <DesignSystemProvider>
      <AccessibilityProvider>
        <ResponsiveProvider>
          <FeedbackProvider>
            {children}
          </FeedbackProvider>
        </ResponsiveProvider>
      </AccessibilityProvider>
    </DesignSystemProvider>
  );
}

export default App;
```

### 2. Use Components

Now you can use design system components directly:

```jsx
// MyPage.jsx
import React from 'react';
import { PageShell, Button, useFeedback } from './src/design-system';

function MyPage() {
  const { addNotification } = useFeedback();
  
  const handleClick = () => {
    addNotification('Button was clicked!', 'success');
  };
  
  return (
    <PageShell title="My Page">
      <Button variant="contained" onClick={handleClick}>
        Click Me
      </Button>
    </PageShell>
  );
}

export default MyPage;
```

## Common Patterns

### Creating a Data Page

```jsx
import React, { useState, useEffect } from 'react';
import { 
  PageShell, 
  DataTable, 
  ErrorBoundary, 
  LoadingSpinner,
  useFeedback 
} from './src/design-system';

function DataPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useFeedback();
  
  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(() => addNotification('Failed to load data', 'error'))
      .finally(() => setLoading(false));
  }, []);
  
  return (
    <ErrorBoundary>
      <PageShell title="My Data">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <DataTable 
            data={data} 
            columns={[
              { key: 'name', label: 'Name', sortable: true },
              { key: 'value', label: 'Value' },
            ]} 
          />
        )}
      </PageShell>
    </ErrorBoundary>
  );
}
```

### Adding User Feedback

```jsx
import React from 'react';
import { Button, useFeedback } from './src/design-system';

function SubmitButton() {
  const { addNotification } = useFeedback();
  
  const handleSubmit = async () => {
    try {
      // Submit data
      await submitData();
      addNotification('Data submitted successfully!', 'success');
    } catch (error) {
      addNotification('Failed to submit data', 'error');
    }
  };
  
  return (
    <Button variant="contained" onClick={handleSubmit}>
      Submit
    </Button>
  );
}
```

### Creating Responsive Components

```jsx
import React from 'react';
import { useResponsive } from './src/design-system';

function ResponsiveComponent() {
  const { isMobile, isDesktop } = useResponsive();
  
  return (
    <div>
      {isMobile ? (
        <div>Mobile Layout</div>
      ) : isDesktop ? (
        <div>Desktop Layout with more columns</div>
      ) : (
        <div>Tablet Layout</div>
      )}
    </div>
  );
}
```

## Component Overview

### Layout
- `PageShell` - Main page layout with navigation
- `SettingsLayout` - Specialized layout for settings pages

### Data Display
- `DataTable` - Table with sorting/filtering capabilities

### Feedback
- `Alert` - Display important messages
- `ErrorBoundary` - Catch and display errors
- `LoadingSpinner` - Indicate loading states
- `ProgressBar` - Show progress for long operations

### Utilities
- `useFeedback` - Show notifications to users
- `useAccessibility` - Access accessibility features
- `useResponsive` - Access responsive features

## Common Props

Most components support:
- `className` - Add custom classes
- `style` - Inline styles
- `sx` - Material UI's sx prop for custom styling

## Troubleshooting

### Components Not Styling Properly
Ensure you've wrapped your app with `DesignSystemProvider`.

### Accessibility Features Not Working
Make sure you've added `AccessibilityProvider`.

### Responsive Features Not Working
Ensure `ResponsiveProvider` is in your component tree.

### Notifications Not Showing
Check that `FeedbackProvider` is present in your app.