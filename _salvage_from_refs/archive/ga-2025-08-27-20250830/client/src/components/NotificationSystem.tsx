import React, { useState, useEffect, useRef } from 'react';
import { useSubscription, gql } from '@apollo/client';

const NOTIFICATION_SUBSCRIPTION = gql`
  subscription NotificationUpdates {
    notificationUpdates {
      id
      type
      title
      message
      severity
      timestamp
      actionId
      investigationId
      metadata
      expiresAt
    }
  }
`;

interface Notification {
  id: string;
  type: 'action_safety' | 'investigation_update' | 'system_alert' | 'user_mention' | 'data_ingestion';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  actionId?: string;
  investigationId?: string;
  metadata?: any;
  expiresAt?: string;
}

interface NotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
  autoHideDuration?: number;
}

function NotificationSystem({ 
  position = 'top-right', 
  maxNotifications = 5,
  autoHideDuration = 5000 
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Subscribe to real-time notifications
  const { data: subscriptionData } = useSubscription(NOTIFICATION_SUBSCRIPTION, {
    errorPolicy: 'all'
  });

  // Handle new notifications from subscription
  useEffect(() => {
    if (subscriptionData?.notificationUpdates) {
      const newNotification = subscriptionData.notificationUpdates;
      addNotification(newNotification);
    }
  }, [subscriptionData]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      // Remove expired notifications
      const now = new Date();
      const active = prev.filter(n => !n.expiresAt || new Date(n.expiresAt) > now);
      
      // Add new notification at the beginning
      const updated = [notification, ...active].slice(0, maxNotifications);
      
      // Play sound for important notifications
      if (notification.severity === 'error' || notification.severity === 'warning') {
        playNotificationSound();
      }

      // Auto-hide notification
      if (autoHideDuration > 0) {
        setTimeout(() => removeNotification(notification.id), autoHideDuration);
      }

      return updated;
    });
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const playNotificationSound = () => {
    // Create a subtle notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gain.gain.setValueAtTime(0.1, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Fallback: silent
    }
  };

  const getNotificationIcon = (type: string, severity: string) => {
    if (severity === 'error') return '❌';
    if (severity === 'warning') return '⚠️';
    if (severity === 'success') return '✅';
    
    switch (type) {
      case 'action_safety': return '🛡️';
      case 'investigation_update': return '🔍';
      case 'system_alert': return '⚙️';
      case 'user_mention': return '👤';
      case 'data_ingestion': return '📊';
      default: return 'ℹ️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#dc2626';
      case 'warning': return '#d97706';
      case 'success': return '#059669';
      case 'info': 
      default: return '#1a73e8';
    }
  };

  const positionStyles = {
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' }
  };

  // Mock notifications for demo (remove in production)
  useEffect(() => {
    const mockNotifications = [
      {
        id: 'demo-1',
        type: 'action_safety' as const,
        title: 'Action Blocked',
        message: 'Action test-action-123 was blocked due to safety concerns',
        severity: 'warning' as const,
        timestamp: new Date().toISOString(),
        actionId: 'test-action-123'
      },
      {
        id: 'demo-2', 
        type: 'investigation_update' as const,
        title: 'Investigation Updated',
        message: 'New entities discovered in investigation sample-investigation',
        severity: 'info' as const,
        timestamp: new Date().toISOString(),
        investigationId: 'sample-investigation'
      }
    ];

    // Add demo notifications after 2 seconds
    setTimeout(() => {
      mockNotifications.forEach((notification, index) => {
        setTimeout(() => addNotification(notification), index * 1000);
      });
    }, 2000);
  }, []);

  return (
    <>
      {/* Notification Bell Icon */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowPanel(!showPanel)}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            position: 'relative'
          }}
        >
          🔔
          {notifications.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '0px',
              right: '0px',
              backgroundColor: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {showPanel && (
          <div className="panel" style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            zIndex: 1000,
            width: '350px',
            maxHeight: '500px',
            overflowY: 'auto',
            marginTop: '8px'
          }}>
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid var(--hairline)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                Notifications ({notifications.length})
              </h3>
              {notifications.length > 0 && (
                <button 
                  onClick={clearAllNotifications}
                  style={{ 
                    color: '#666', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
                <div>No notifications</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  You'll see real-time updates here
                </div>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--hairline)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ fontSize: '18px', marginTop: '2px' }}>
                      {getNotificationIcon(notification.type, notification.severity)}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '4px'
                      }}>
                        <h4 style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          margin: 0,
                          color: getSeverityColor(notification.severity)
                        }}>
                          {notification.title}
                        </h4>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#999',
                            fontSize: '12px',
                            padding: '2px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      
                      <p style={{ 
                        fontSize: '13px', 
                        color: '#666', 
                        margin: '0 0 8px 0',
                        lineHeight: 1.4
                      }}>
                        {notification.message}
                      </p>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontSize: '11px',
                        color: '#999'
                      }}>
                        <span>
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </span>
                        {(notification.actionId || notification.investigationId) && (
                          <span style={{
                            backgroundColor: '#f3f4f6',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '10px'
                          }}>
                            {notification.actionId || notification.investigationId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 10000,
        pointerEvents: 'none'
      }}>
        {notifications.slice(0, 3).map(notification => (
          <div
            key={`toast-${notification.id}`}
            className="panel"
            style={{
              marginBottom: '8px',
              padding: '16px',
              maxWidth: '350px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              pointerEvents: 'auto',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ fontSize: '16px' }}>
                {getNotificationIcon(notification.type, notification.severity)}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  margin: '0 0 4px 0',
                  color: getSeverityColor(notification.severity)
                }}>
                  {notification.title}
                </h4>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#666', 
                  margin: 0,
                  lineHeight: 1.4
                }}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  fontSize: '12px'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Click outside to close panel */}
      {showPanel && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowPanel(false)}
        />
      )}

      {/* CSS Animation */}
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(${position.includes('right') ? '100%' : '-100%'});
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </>
  );
}

export default NotificationSystem;