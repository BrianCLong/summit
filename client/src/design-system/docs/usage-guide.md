# Summit Design System Usage Guide

This guide provides comprehensive documentation for using the Summit Design System components effectively.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Providers and Contexts](#providers-and-contexts)
3. [Layout Components](#layout-components)
4. [Data Display Components](#data-display-components)
5. [Feedback Components](#feedback-components)
6. [Input Components](#input-components)
7. [Accessibility Utilities](#accessibility-utilities)
8. [Responsive Utilities](#responsive-utilities)
9. [Best Practices](#best-practices)

## Getting Started

To use the Summit Design System in your application, first wrap your app with the required providers:

```jsx
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
```

## Providers and Contexts

### Design System Provider
Wraps the application with the design system theme and configuration.

```jsx
import { DesignSystemProvider } from './src/design-system';

function App() {
  return (
    <DesignSystemProvider>
      {/* Your app components */}
    </DesignSystemProvider>
  );
}
```

### Accessibility Provider
Provides accessibility context and utilities.

```jsx
import { AccessibilityProvider, useAccessibility } from './src/design-system';

function MyComponent() {
  const { keyboardNavigation, isHighContrastMode } = useAccessibility();
  
  return (
    <div className={keyboardNavigation ? 'focus-visible' : ''}>
      Accessible component
    </div>
  );
}
```

### Feedback Provider
Provides notification and error handling capabilities.

```jsx
import { FeedbackProvider, useFeedback } from './src/design-system';

function MyComponent() {
  const { addNotification } = useFeedback();
  
  const handleClick = () => {
    addNotification('Action completed successfully!', 'success');
  };
  
  return <button onClick={handleClick}>Click me</button>;
}
```

### Responsive Provider
Provides device detection and responsive utilities.

```jsx
import { ResponsiveProvider, useResponsive } from './src/design-system';

function MyComponent() {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  return (
    <div>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
    </div>
  );
}
```

## Layout Components

### PageShell
The main layout component for pages with navigation.

```jsx
import { PageShell } from './src/design-system';

function MyPage() {
  return (
    <PageShell title="My Page" navigation={navItems}>
      <div>Page content</div>
    </PageShell>
  );
}
```

### SettingsLayout
Layout specifically designed for settings pages.

```jsx
import { SettingsLayout } from './src/design-system';

function SettingsPage() {
  return (
    <SettingsLayout>
      <div>Settings content</div>
    </SettingsLayout>
  );
}
```

## Data Display Components

### DataTable
A responsive table component with sorting and filtering capabilities.

```jsx
import { DataTable } from './src/design-system';

function MyTable({ data }) {
  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
  ];
  
  return (
    <DataTable 
      data={data} 
      columns={columns}
      onSort={handleSort}
      onFilter={handleFilter}
    />
  );
}
```

## Feedback Components

### Alert
Shows important messages and notifications.

```jsx
import { Alert } from './src/design-system';

function MyComponent() {
  return (
    <Alert severity="info" title="Information">
      This is important information for the user.
    </Alert>
  );
}
```

### ErrorBoundary
Catches and displays errors that occur in child components.

```jsx
import { ErrorBoundary } from './src/design-system';

function MyPage() {
  return (
    <ErrorBoundary>
      <ErrorProneComponent />
    </ErrorBoundary>
  );
}
```

### Loading States
Various loading indicators for different use cases.

```jsx
import { LoadingSpinner, LoadingBackdrop, ProgressBar } from './src/design-system';

// Inline loading spinner
function MyComponent() {
  const [loading, setLoading] = useState(false);
  
  return (
    <div>
      {loading ? <LoadingSpinner /> : <Content />}
    </div>
  );
}

// Full-screen loading backdrop
function MyPage() {
  const [loading, setLoading] = useState(false);
  
  return (
    <div>
      <LoadingBackdrop open={loading} message="Processing..." />
      <Content />
    </div>
  );
}

// Progress bar
function MyComponent() {
  const [progress, setProgress] = useState(0);
  
  return (
    <ProgressBar value={progress} variant="determinate" />
  );
}
```

## Input Components

Coming soon - detailed documentation for input components.

## Accessibility Utilities

### Using Accessibility Context

```jsx
import { useAccessibility } from './src/design-system';

function MyComponent() {
  const { keyboardNavigation } = useAccessibility();
  
  return (
    <button 
      className={keyboardNavigation ? 'custom-focus-style' : ''}
    >
      Accessible Button
    </button>
  );
}
```

### Accessibility Utilities

```jsx
import { focusFirstElement, trapFocus } from './src/design-system';

// Focus the first focusable element in a container
useEffect(() => {
  focusFirstElement(modalRef.current);
}, []);

// Trap focus within a modal
useEffect(() => {
  if (isOpen) {
    return trapFocus(modalRef.current);
  }
}, [isOpen]);
```

## Responsive Utilities

### Using Responsive Context

```jsx
import { useResponsive } from './src/design-system';

function MyComponent() {
  const { deviceType, isMobile, isDesktop } = useResponsive();
  
  return (
    <div>
      {isMobile && <MobileView />}
      {!isMobile && <DesktopView />}
    </div>
  );
}
```

### Responsive Styling

```jsx
import { BREAKPOINTS, mediaQuery } from './src/design-system';

const styles = {
  base: {
    padding: '1rem',
    [mediaQuery.mobile]: {
      padding: '0.5rem',
    },
    [mediaQuery.desktop]: {
      padding: '2rem',
    }
  }
};
```

## Best Practices

### Component Composition
- Always wrap your application with the required providers
- Use the design system components instead of raw HTML elements
- Follow the component hierarchy (PageShell -> Layout -> Content)

### Accessibility
- Always use semantic HTML elements
- Provide proper labels for interactive elements
- Ensure proper focus management
- Test with screen readers

### Responsive Design
- Follow mobile-first design principles
- Use the provided responsive utilities
- Test on different device sizes
- Ensure touch targets are appropriately sized

### Error Handling
- Wrap sections that might error with ErrorBoundary
- Provide meaningful error messages to users
- Log errors appropriately
- Gracefully degrade functionality when possible

### Performance
- Use the design system's optimized components
- Implement proper loading states
- Consider virtualization for large datasets
- Optimize images and assets

## Examples

### Complete Page Example

```jsx
import React from 'react';
import { 
  PageShell, 
  DataTable, 
  ErrorBoundary,
  LoadingSpinner,
  useFeedback 
} from './src/design-system';

function UsersPage() {
  const { addNotification } = useFeedback();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role' },
  ];
  
  useEffect(() => {
    fetchData()
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(error => {
        addNotification('Failed to load users', 'error');
        setLoading(false);
      });
  }, []);
  
  return (
    <ErrorBoundary>
      <PageShell title="Users" navigation={navItems}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <DataTable data={users} columns={columns} />
        )}
      </PageShell>
    </ErrorBoundary>
  );
}
```