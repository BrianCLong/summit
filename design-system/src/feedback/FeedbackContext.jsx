import React, { useState, useEffect, createContext, useContext } from 'react';
import { Alert as MuiAlert, Snackbar as MuiSnackbar, AlertTitle } from '@mui/material';
import { useAccessibility } from '../accessibility/AccessibilityContext';

// Create feedback context
const FeedbackContext = createContext();

// Feedback provider component
export const FeedbackProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Add a notification
  const addNotification = (message, type = 'info', duration = 6000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  // Remove a notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Add an alert
  const addAlert = (message, type = 'info', title = null) => {
    const id = Date.now() + Math.random();
    const alert = { id, message, type, title };
    
    setAlerts(prev => [...prev, alert]);
  };

  // Remove an alert
  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const value = {
    notifications,
    alerts,
    addNotification,
    removeNotification,
    addAlert,
    removeAlert,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {/* Render notifications */}
      {notifications.map(notification => (
        <NotificationSnackbar
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </FeedbackContext.Provider>
  );
};

// Notification Snackbar Component
const NotificationSnackbar = ({ notification, onClose }) => {
  const { liveAnnouncer } = useAccessibility();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // Announce notification to screen readers
    if (liveAnnouncer && notification.message) {
      liveAnnouncer.announce(`Notification: ${notification.message}`);
    }
  }, [notification.message]);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    onClose();
  };

  return (
    <MuiSnackbar
      open={open}
      autoHideDuration={notification.duration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ mt: 2 }}
    >
      <MuiAlert
        onClose={handleClose}
        severity={notification.type}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {notification.message}
      </MuiAlert>
    </MuiSnackbar>
  );
};

// Custom hook to use feedback context
export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

// Alert component for inline alerts
export const Alert = ({ severity = 'info', title, children, ...props }) => {
  return (
    <MuiAlert severity={severity} {...props}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {children}
    </MuiAlert>
  );
};

// Error boundary component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to service or console
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" title="Something went wrong">
          <p>We're sorry, but an error occurred. Please try refreshing the page.</p>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo.componentStack}
            </details>
          )}
        </Alert>
      );
    }

    return this.props.children;
  }
}