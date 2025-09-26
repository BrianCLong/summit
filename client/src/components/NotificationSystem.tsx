import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gql, useMutation, useQuery, useSubscription } from '@apollo/client';

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
      readAt
      status
    }
  }
`;

const NOTIFICATION_CENTER_QUERY = gql`
  query NotificationCenter($limit: Int, $onlyUnread: Boolean) {
    notifications(limit: $limit, onlyUnread: $onlyUnread) {
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
      readAt
      status
    }
    notificationPreferences {
      id
      eventType
      channels {
        inApp
        email
        sms
      }
      email
      phoneNumber
    }
    unreadNotificationCount
  }
`;

const UPDATE_NOTIFICATION_PREFERENCE = gql`
  mutation UpdateNotificationPreference($input: NotificationPreferenceInput!) {
    updateNotificationPreference(input: $input) {
      id
      eventType
      channels {
        inApp
        email
        sms
      }
      email
      phoneNumber
    }
  }
`;

const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      id
      status
      readAt
    }
  }
`;

type Notification = {
  id: string;
  type: 'INGESTION_COMPLETE' | 'ML_JOB_STATUS' | 'CUSTOM';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  actionId?: string | null;
  investigationId?: string | null;
  metadata?: any;
  expiresAt?: string | null;
  readAt?: string | null;
  status: string;
};

type Preference = {
  id: string;
  eventType: string;
  channels: { inApp: boolean; email: boolean; sms: boolean };
  email?: string | null;
  phoneNumber?: string | null;
};

interface NotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
  autoHideDuration?: number;
}

function NotificationSystem({
  position = 'top-right',
  maxNotifications = 10,
  autoHideDuration = 5000,
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data, refetch } = useQuery(NOTIFICATION_CENTER_QUERY, {
    variables: { limit: maxNotifications },
    fetchPolicy: 'cache-and-network',
  });

  const [updatePreferenceMutation, { loading: preferenceUpdating }] = useMutation(UPDATE_NOTIFICATION_PREFERENCE);
  const [markNotificationReadMutation] = useMutation(MARK_NOTIFICATION_READ);

  useEffect(() => {
    if (data?.notifications) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const incoming = data.notifications.filter((n: Notification) => !existingIds.has(n.id));
        const merged = [...incoming, ...prev];
        return merged.slice(0, maxNotifications);
      });
    }
    if (data?.notificationPreferences) {
      setPreferences(data.notificationPreferences);
    }
  }, [data, maxNotifications]);

  useSubscription(NOTIFICATION_SUBSCRIPTION, {
    onData: ({ data: subscriptionData }) => {
      const payload = subscriptionData?.data?.notificationUpdates;
      if (!payload) return;
      addNotification(payload as Notification);
    },
    errorPolicy: 'all',
  });

  const unreadCount = useMemo(() => {
    if (data?.unreadNotificationCount !== undefined) {
      return data.unreadNotificationCount;
    }
    return notifications.filter((n) => n.status !== 'read').length;
  }, [data?.unreadNotificationCount, notifications]);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => {
      const deduped = prev.filter((n) => n.id !== notification.id);
      const updated = [notification, ...deduped].slice(0, maxNotifications);

      if (notification.severity === 'error' || notification.severity === 'warning') {
        playNotificationSound();
      }

      if (autoHideDuration > 0 && (!notification.readAt || notification.status !== 'read')) {
        setTimeout(() => removeNotification(notification.id, false), autoHideDuration);
      }

      return updated;
    });
  };

  const removeNotification = (id: string, markRead: boolean = true) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (markRead) {
      markNotificationReadMutation({ variables: { id } }).catch(() => {
        /* swallow read errors for UX */
      });
      refetch().catch(() => {});
    }
  };

  const clearAllNotifications = () => {
    const ids = notifications.map((n) => n.id);
    setNotifications([]);
    Promise.all(ids.map((id) => markNotificationReadMutation({ variables: { id } }))).finally(() => refetch());
  };

  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        return;
      }

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
      // intentionally silent
    }
  };

  const getNotificationIcon = (type: string, severity: string) => {
    if (severity === 'error') return '❌';
    if (severity === 'warning') return '⚠️';
    if (severity === 'success') return '✅';

    switch (type) {
      case 'INGESTION_COMPLETE':
        return '📦';
      case 'ML_JOB_STATUS':
        return '🧠';
      default:
        return 'ℹ️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return '#dc2626';
      case 'warning':
        return '#d97706';
      case 'success':
        return '#059669';
      case 'info':
      default:
        return '#1a73e8';
    }
  };

  const positionStyles = {
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
  } as const;

  const handlePreferenceToggle = async (
    preference: Preference,
    channel: 'inApp' | 'email' | 'sms',
    value: boolean,
  ) => {
    const nextChannels = { ...preference.channels, [channel]: value };
    const result = await updatePreferenceMutation({
      variables: {
        input: {
          eventType: preference.eventType,
          channels: nextChannels,
          email: preference.email,
          phoneNumber: preference.phoneNumber,
        },
      },
    });

    if (result.data?.updateNotificationPreference) {
      setPreferences((prev) =>
        prev.map((p) => (p.id === preference.id ? result.data.updateNotificationPreference : p)),
      );
    }
  };

  const handleContactBlur = async (preference: Preference, field: 'email' | 'phoneNumber', value: string) => {
    const result = await updatePreferenceMutation({
      variables: {
        input: {
          eventType: preference.eventType,
          channels: preference.channels,
          email: field === 'email' ? value : preference.email,
          phoneNumber: field === 'phoneNumber' ? value : preference.phoneNumber,
        },
      },
    });

    if (result.data?.updateNotificationPreference) {
      setPreferences((prev) =>
        prev.map((p) => (p.id === preference.id ? result.data.updateNotificationPreference : p)),
      );
    }
  };

  return (
    <>
      <audio ref={audioRef} style={{ display: 'none' }} />
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
            position: 'relative',
          }}
          aria-label="Notifications"
        >
          🔔
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '0px',
                right: '0px',
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                minWidth: '16px',
                height: '16px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                padding: '0 4px',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showPanel && (
          <div
            className="panel"
            style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              zIndex: 1000,
              width: '360px',
              maxHeight: '520px',
              overflowY: 'auto',
              marginTop: '8px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid var(--hairline)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Notifications</h3>
                <span style={{ fontSize: '12px', color: '#666' }}>{unreadCount} unread</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowPreferences((prev) => !prev)}
                  style={{
                    color: '#1a73e8',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {showPreferences ? 'Hide Preferences' : 'Preferences'}
                </button>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    style={{
                      color: '#666',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {!showPreferences && (
              <>
                {notifications.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
                    <div>No notifications yet</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Real-time alerts about ingestion and ML jobs appear here.
                    </div>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      style={{
                        padding: '16px',
                        borderBottom: '1px solid var(--hairline)',
                        position: 'relative',
                        backgroundColor: notification.status === 'read' ? '#f9fafb' : 'white',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ fontSize: '18px', marginTop: '2px' }}>
                          {getNotificationIcon(notification.type, notification.severity)}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '4px',
                              gap: '8px',
                            }}
                          >
                            <h4
                              style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                margin: 0,
                                color: getSeverityColor(notification.severity),
                              }}
                            >
                              {notification.title}
                            </h4>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {notification.status !== 'read' && (
                                <button
                                  onClick={() => removeNotification(notification.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#2563eb',
                                    fontSize: '12px',
                                  }}
                                >
                                  Mark read
                                </button>
                              )}
                              <button
                                onClick={() => removeNotification(notification.id, false)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#999',
                                  fontSize: '12px',
                                }}
                                aria-label="Dismiss notification"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <p
                            style={{
                              fontSize: '13px',
                              color: '#444',
                              margin: '0 0 8px 0',
                              lineHeight: 1.4,
                            }}
                          >
                            {notification.message}
                          </p>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '11px',
                              color: '#999',
                              flexWrap: 'wrap',
                              gap: '4px',
                            }}
                          >
                            <span>{new Date(notification.timestamp).toLocaleString()}</span>
                            {(notification.actionId || notification.investigationId) && (
                              <span
                                style={{
                                  backgroundColor: '#f3f4f6',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontSize: '10px',
                                }}
                              >
                                {notification.actionId || notification.investigationId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {showPreferences && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Delivery Preferences</h4>
                {preferences.map((preference) => (
                  <div
                    key={preference.id}
                    style={{
                      border: '1px solid var(--hairline)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{preference.eventType}</div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="checkbox"
                          checked={preference.channels.inApp}
                          onChange={(event) => handlePreferenceToggle(preference, 'inApp', event.target.checked)}
                          disabled={preferenceUpdating}
                        />
                        In-app
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="checkbox"
                          checked={preference.channels.email}
                          onChange={(event) => handlePreferenceToggle(preference, 'email', event.target.checked)}
                          disabled={preferenceUpdating}
                        />
                        Email
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="checkbox"
                          checked={preference.channels.sms}
                          onChange={(event) => handlePreferenceToggle(preference, 'sms', event.target.checked)}
                          disabled={preferenceUpdating}
                        />
                        SMS
                      </label>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>Email address</span>
                        <input
                          key={`email-${preference.id}-${preference.email ?? ''}`}
                          type="email"
                          defaultValue={preference.email ?? ''}
                          placeholder="alerts@example.com"
                          onBlur={(event) => handleContactBlur(preference, 'email', event.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--hairline)',
                          }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>SMS number</span>
                        <input
                          key={`phone-${preference.id}-${preference.phoneNumber ?? ''}`}
                          type="tel"
                          defaultValue={preference.phoneNumber ?? ''}
                          placeholder="+1 555 0100"
                          onBlur={(event) => handleContactBlur(preference, 'phoneNumber', event.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--hairline)',
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
                {preferences.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#666' }}>Preferences will appear once created for this user.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          position: 'fixed',
          ...positionStyles[position],
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      >
        {notifications.slice(0, 3).map((notification) => (
          <div
            key={`toast-${notification.id}`}
            className="panel"
            style={{
              marginBottom: '8px',
              padding: '16px',
              maxWidth: '350px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              pointerEvents: 'auto',
              animation: 'slideIn 0.3s ease-out',
              backgroundColor: 'white',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ fontSize: '16px' }}>{getNotificationIcon(notification.type, notification.severity)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      margin: 0,
                      color: getSeverityColor(notification.severity),
                    }}
                  >
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
                    }}
                    aria-label="Dismiss toast"
                  >
                    ✕
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: '#444', margin: '4px 0 8px 0', lineHeight: 1.4 }}>
                  {notification.message}
                </p>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default NotificationSystem;
