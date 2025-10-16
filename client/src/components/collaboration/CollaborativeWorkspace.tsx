import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'analyst' | 'investigator' | 'viewer';
  status: 'active' | 'idle' | 'offline';
  lastSeen: number;
  currentLocation?: {
    tab: string;
    entityId?: string;
    investigationId?: string;
  };
  cursor?: {
    x: number;
    y: number;
    visible: boolean;
  };
}

interface CollaborationEvent {
  id: string;
  type:
    | 'user_joined'
    | 'user_left'
    | 'cursor_move'
    | 'selection_change'
    | 'edit'
    | 'comment'
    | 'annotation';
  userId: string;
  timestamp: number;
  data: any;
}

interface SharedWorkspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  participants: User[];
  investigationIds: string[];
  sharedEntities: string[];
  permissions: {
    [userId: string]: {
      canEdit: boolean;
      canComment: boolean;
      canShare: boolean;
      canDelete: boolean;
    };
  };
  settings: {
    allowAnonymousViewing: boolean;
    requireApprovalToJoin: boolean;
    maxParticipants: number;
    recordSession: boolean;
  };
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

interface LiveAnnotation {
  id: string;
  userId: string;
  type: 'comment' | 'highlight' | 'arrow' | 'rectangle' | 'circle';
  content?: string;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  targetId?: string; // entity or element ID
  timestamp: number;
  isVisible: boolean;
  isPersistent: boolean;
}

interface CollaborativeWorkspaceProps {
  workspaceId?: string;
  investigationId?: string;
  currentUser: User;
  onUserJoin?: (user: User) => void;
  onUserLeave?: (userId: string) => void;
  onWorkspaceShare?: (workspace: SharedWorkspace) => void;
  onAnnotationCreate?: (annotation: LiveAnnotation) => void;
  className?: string;
}

const CollaborativeWorkspace: React.FC<CollaborativeWorkspaceProps> = ({
  workspaceId,
  investigationId,
  currentUser,
  onUserJoin,
  onUserLeave,
  onWorkspaceShare,
  onAnnotationCreate,
  className = '',
}) => {
  const [workspace, setWorkspace] = useState<SharedWorkspace | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [collaborationEvents, setCollaborationEvents] = useState<
    CollaborationEvent[]
  >([]);
  const [annotations, setAnnotations] = useState<LiveAnnotation[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [newAnnotation, setNewAnnotation] =
    useState<Partial<LiveAnnotation> | null>(null);
  const [cursorPositions, setCursorPositions] = useState<{
    [userId: string]: { x: number; y: number };
  }>({});

  const workspaceRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Mock workspace data
  const mockWorkspace: SharedWorkspace = useMemo(
    () => ({
      id: workspaceId || 'workspace-001',
      name: `Investigation Workspace - ${investigationId || 'Default'}`,
      description: 'Collaborative intelligence analysis workspace',
      ownerId: currentUser.id,
      participants: [
        currentUser,
        {
          id: 'user-002',
          name: 'Sarah Chen',
          email: 'sarah.chen@intelgraph.com',
          role: 'analyst',
          status: 'active',
          lastSeen: Date.now() - 300000,
          currentLocation: { tab: 'graph-viz', investigationId },
        },
        {
          id: 'user-003',
          name: 'Alex Rodriguez',
          email: 'alex.rodriguez@intelgraph.com',
          role: 'investigator',
          status: 'idle',
          lastSeen: Date.now() - 900000,
          currentLocation: { tab: 'threat-intel' },
        },
        {
          id: 'user-004',
          name: 'Michael Zhang',
          email: 'michael.zhang@intelgraph.com',
          role: 'viewer',
          status: 'active',
          lastSeen: Date.now() - 60000,
          currentLocation: { tab: 'timeline' },
        },
      ],
      investigationIds: investigationId ? [investigationId] : [],
      sharedEntities: ['entity-001', 'entity-002', 'entity-003'],
      permissions: {
        'user-002': {
          canEdit: true,
          canComment: true,
          canShare: true,
          canDelete: false,
        },
        'user-003': {
          canEdit: true,
          canComment: true,
          canShare: false,
          canDelete: false,
        },
        'user-004': {
          canEdit: false,
          canComment: true,
          canShare: false,
          canDelete: false,
        },
      },
      settings: {
        allowAnonymousViewing: false,
        requireApprovalToJoin: true,
        maxParticipants: 10,
        recordSession: true,
      },
      createdAt: new Date(Date.now() - 3600000),
      lastActivity: new Date(),
      isActive: true,
    }),
    [workspaceId, investigationId, currentUser],
  );

  const mockAnnotations: LiveAnnotation[] = useMemo(
    () => [
      {
        id: 'annotation-001',
        userId: 'user-002',
        type: 'comment',
        content:
          'This connection pattern looks suspicious - potential C2 infrastructure',
        position: { x: 450, y: 200 },
        targetId: 'entity-001',
        timestamp: Date.now() - 1200000,
        isVisible: true,
        isPersistent: true,
      },
      {
        id: 'annotation-002',
        userId: 'user-003',
        type: 'highlight',
        content: 'High-priority IOC cluster',
        position: { x: 300, y: 150, width: 120, height: 80 },
        timestamp: Date.now() - 600000,
        isVisible: true,
        isPersistent: false,
      },
      {
        id: 'annotation-003',
        userId: currentUser.id,
        type: 'arrow',
        content: 'Timeline correlation point',
        position: { x: 600, y: 300 },
        timestamp: Date.now() - 300000,
        isVisible: true,
        isPersistent: true,
      },
    ],
    [currentUser.id],
  );

  // Initialize workspace and WebSocket connection
  useEffect(() => {
    setWorkspace(mockWorkspace);
    setActiveUsers(
      mockWorkspace.participants.filter((user) => user.status === 'active'),
    );
    setAnnotations(mockAnnotations);

    // Mock WebSocket connection
    const mockWs = {
      send: (data: string) => console.log('WS Send:', data),
      close: () => console.log('WS Closed'),
      readyState: 1,
    } as unknown as WebSocket;
    wsRef.current = mockWs;

    // Simulate periodic collaboration events
    const interval = setInterval(() => {
      const event: CollaborationEvent = {
        id: `event-${Date.now()}`,
        type: Math.random() > 0.5 ? 'cursor_move' : 'selection_change',
        userId:
          mockWorkspace.participants[
            Math.floor(Math.random() * mockWorkspace.participants.length)
          ].id,
        timestamp: Date.now(),
        data: { x: Math.random() * 800, y: Math.random() * 600 },
      };

      setCollaborationEvents((prev) => [...prev.slice(-20), event]);

      if (event.type === 'cursor_move') {
        setCursorPositions((prev) => ({
          ...prev,
          [event.userId]: { x: event.data.x, y: event.data.y },
        }));
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      mockWs.close();
    };
  }, [mockWorkspace, mockAnnotations]);

  // Handle mouse movement for cursor tracking
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!workspaceRef.current) return;

      const rect = workspaceRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Send cursor position to other users
      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(
          JSON.stringify({
            type: 'cursor_move',
            userId: currentUser.id,
            data: { x, y },
          }),
        );
      }
    },
    [currentUser.id],
  );

  // Handle annotation creation
  const handleAnnotationStart = useCallback(
    (e: React.MouseEvent, type: LiveAnnotation['type']) => {
      if (!workspaceRef.current) return;

      const rect = workspaceRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const annotation: Partial<LiveAnnotation> = {
        id: `annotation-${Date.now()}`,
        userId: currentUser.id,
        type,
        position: { x, y },
        timestamp: Date.now(),
        isVisible: true,
        isPersistent: type === 'comment',
      };

      setNewAnnotation(annotation);
    },
    [currentUser.id],
  );

  const handleAnnotationComplete = useCallback(
    (content?: string) => {
      if (!newAnnotation) return;

      const annotation: LiveAnnotation = {
        ...newAnnotation,
        content,
        isPersistent: !!content,
      } as LiveAnnotation;

      setAnnotations((prev) => [...prev, annotation]);
      onAnnotationCreate?.(annotation);
      setNewAnnotation(null);

      // Send annotation to other users
      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(
          JSON.stringify({
            type: 'annotation_create',
            userId: currentUser.id,
            data: annotation,
          }),
        );
      }
    },
    [newAnnotation, currentUser.id, onAnnotationCreate],
  );

  const getUserColor = (userId: string) => {
    const colors = [
      '#1a73e8',
      '#e91e63',
      '#4caf50',
      '#ff9800',
      '#9c27b0',
      '#f44336',
      '#2196f3',
      '#00bcd4',
    ];
    const index =
      workspace?.participants.findIndex((u) => u.id === userId) || 0;
    return colors[index % colors.length];
  };

  const getUserName = (userId: string) => {
    return (
      workspace?.participants.find((u) => u.id === userId)?.name ||
      'Unknown User'
    );
  };

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div
      className={`collaborative-workspace ${className}`}
      style={{ position: 'relative', height: '100%', overflow: 'hidden' }}
    >
      {/* Collaboration Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
            🤝 {workspace?.name || 'Collaborative Workspace'}
          </h4>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {activeUsers.slice(0, 4).map((user) => (
              <div
                key={user.id}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: getUserColor(user.id),
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                  marginLeft: '-4px',
                }}
                title={user.name}
              >
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
            ))}

            {activeUsers.length > 4 && (
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                  marginLeft: '-4px',
                }}
              >
                +{activeUsers.length - 4}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isRecording && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: '#dc3545',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#dc3545',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite',
                }}
              />
              Recording
            </div>
          )}

          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: showAnnotations ? '#e3f2fd' : 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            📝 Annotations ({annotations.length})
          </button>

          <button
            onClick={() => setShowParticipants(!showParticipants)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: showParticipants ? '#e3f2fd' : 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            👥 Participants ({activeUsers.length})
          </button>
        </div>
      </div>

      {/* Collaborative Content Area */}
      <div
        ref={workspaceRef}
        onMouseMove={handleMouseMove}
        style={{
          position: 'relative',
          height: 'calc(100% - 60px)',
          backgroundColor: '#fafafa',
          cursor: newAnnotation ? 'crosshair' : 'default',
        }}
      >
        {/* Live Cursors */}
        {Object.entries(cursorPositions).map(([userId, pos]) => {
          if (userId === currentUser.id) return null;
          return (
            <div
              key={userId}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  width: '0',
                  height: '0',
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: `12px solid ${getUserColor(userId)}`,
                }}
              />
              <div
                style={{
                  backgroundColor: getUserColor(userId),
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: '600',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                }}
              >
                {getUserName(userId)}
              </div>
            </div>
          );
        })}

        {/* Live Annotations */}
        {showAnnotations &&
          annotations
            .filter((a) => a.isVisible)
            .map((annotation) => (
              <div
                key={annotation.id}
                style={{
                  position: 'absolute',
                  left: annotation.position.x,
                  top: annotation.position.y,
                  width: annotation.position.width,
                  height: annotation.position.height,
                  pointerEvents:
                    annotation.type === 'comment' ? 'auto' : 'none',
                  zIndex: 900,
                }}
              >
                {annotation.type === 'comment' && (
                  <div
                    style={{
                      backgroundColor: getUserColor(annotation.userId),
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      maxWidth: '200px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {getUserName(annotation.userId)}
                    </div>
                    <div>{annotation.content}</div>
                    <div
                      style={{
                        fontSize: '10px',
                        opacity: 0.8,
                        marginTop: '4px',
                      }}
                    >
                      {formatTimeAgo(annotation.timestamp)}
                    </div>

                    {/* Comment tail */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-6px',
                        left: '12px',
                        width: '0',
                        height: '0',
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: `6px solid ${getUserColor(annotation.userId)}`,
                      }}
                    />
                  </div>
                )}

                {annotation.type === 'highlight' && (
                  <div
                    style={{
                      backgroundColor: `${getUserColor(annotation.userId)}20`,
                      border: `2px solid ${getUserColor(annotation.userId)}`,
                      borderRadius: '4px',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                )}

                {annotation.type === 'arrow' && (
                  <div
                    style={{
                      width: '0',
                      height: '0',
                      borderLeft: '12px solid transparent',
                      borderRight: '12px solid transparent',
                      borderTop: `20px solid ${getUserColor(annotation.userId)}`,
                    }}
                  />
                )}
              </div>
            ))}

        {/* Participants Panel */}
        {showParticipants && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '280px',
              backgroundColor: 'white',
              border: '1px solid var(--hairline)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--hairline)',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              Workspace Participants
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {workspace?.participants.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: getUserColor(user.id),
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                      {user.name}
                      {user.id === currentUser.id && ' (You)'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {user.role} • {user.currentLocation?.tab || 'offline'}
                    </div>
                  </div>

                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor:
                        user.status === 'active'
                          ? '#4caf50'
                          : user.status === 'idle'
                            ? '#ffc107'
                            : '#6c757d',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Annotation Tools */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            display: 'flex',
            gap: '8px',
            backgroundColor: 'white',
            padding: '8px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {['comment', 'highlight', 'arrow'].map((type) => (
            <button
              key={type}
              onClick={(e) =>
                handleAnnotationStart(e, type as LiveAnnotation['type'])
              }
              style={{
                padding: '8px',
                fontSize: '16px',
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title={`Add ${type}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {type === 'comment' && '💬'}
              {type === 'highlight' && '🖍️'}
              {type === 'arrow' && '↗️'}
            </button>
          ))}
        </div>

        {/* Activity Feed */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            width: '250px',
            maxHeight: '200px',
            backgroundColor: 'white',
            border: '1px solid var(--hairline)',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--hairline)',
              fontWeight: '600',
              fontSize: '12px',
            }}
          >
            Live Activity
          </div>

          <div>
            {collaborationEvents.slice(-5).map((event) => (
              <div
                key={event.id}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: getUserColor(event.userId),
                  }}
                />
                <span
                  style={{
                    color: getUserColor(event.userId),
                    fontWeight: '500',
                  }}
                >
                  {getUserName(event.userId)}
                </span>
                <span style={{ color: '#666' }}>
                  {event.type === 'cursor_move' && 'moved cursor'}
                  {event.type === 'selection_change' && 'changed selection'}
                  {event.type === 'edit' && 'made an edit'}
                  {event.type === 'comment' && 'added comment'}
                </span>
                <span style={{ color: '#999', marginLeft: 'auto' }}>
                  {formatTimeAgo(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CollaborativeWorkspace;
