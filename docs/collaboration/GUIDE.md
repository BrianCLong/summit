# Collaborative Intelligence Platform - Complete Guide

## Overview

The Collaborative Intelligence Platform provides enterprise-grade collaboration features for team-based intelligence analysis, including workspaces, real-time co-editing, commenting, version control, knowledge management, and workflow capabilities.

## Architecture

The platform is built on a modular architecture with the following key packages:

### Core Packages

1. **@intelgraph/workspace** - Multi-tenant workspace management with RBAC
2. **@intelgraph/real-time-sync** - Operational transformation for concurrent editing
3. **@intelgraph/commenting** - Thread-based commenting and annotations
4. **@intelgraph/version-control** - Git-like version control for analyses
5. **@intelgraph/collaboration** - Integration hub for all collaboration features

### Backend Services

1. **collaboration-service** - REST API and WebSocket server for real-time collaboration
2. **notification-service** - Real-time notifications and activity feeds

## Features

### 1. Team Workspaces and Projects

**Multi-tenant workspace isolation** with project-based organization:

```typescript
import { WorkspaceManager } from '@intelgraph/workspace';

// Create workspace
const workspace = await workspaceManager.createWorkspace(
  'Intelligence Team',
  userId,
  {
    description: 'Main intelligence analysis workspace',
    slug: 'intel-team'
  }
);

// Create project
const project = await workspaceManager.createProject(
  workspace.id,
  'Operation Phoenix',
  userId,
  {
    description: 'Counter-terrorism investigation',
    color: '#FF5733',
    icon: '🔥',
    isPrivate: true
  }
);

// Invite team members
const invitation = await workspaceManager.inviteMember(
  workspace.id,
  'analyst@agency.gov',
  WorkspaceRole.MEMBER,
  userId
);
```

**Role-based access control (RBAC)**:

```typescript
// Check permissions
const permCheck = await workspaceManager.checkPermission(
  {
    userId: 'user123',
    workspaceId: workspace.id,
    resourceType: 'analysis',
    resourceId: 'analysis456'
  },
  ResourcePermission.WRITE
);

if (permCheck.granted) {
  // User can write
}

// Check role hierarchy
const canManage = await workspaceManager.hasRole(
  workspace.id,
  userId,
  WorkspaceRole.ADMIN
);
```

**Workspace analytics**:

```typescript
const metrics = await workspaceManager.getWorkspaceMetrics(workspace.id);
console.log(metrics);
// {
//   totalMembers: 25,
//   activeMembers: 18,
//   totalProjects: 12,
//   activeProjects: 8,
//   recentActivityCount: 156,
//   membersByRole: { owner: 1, admin: 3, member: 18, viewer: 3 }
// }
```

### 2. Real-Time Collaboration

**Operational transformation** for concurrent editing:

```typescript
import { SyncEngine, OperationalTransform } from '@intelgraph/real-time-sync';

// Initialize sync engine
const syncEngine = new SyncEngine(syncStore);

// Create sync session
const session = await syncEngine.createSession(
  documentId,
  userId,
  workspaceId,
  ['read', 'write']
);

// Handle incoming operations
await syncEngine.handleOperation(session.id, {
  id: 'op123',
  type: OperationType.INSERT,
  position: 10,
  content: 'New text',
  userId: 'user123',
  timestamp: Date.now(),
  version: 5
});

// Listen for applied operations
syncEngine.on('operation:applied', ({ documentId, operation, state }) => {
  // Broadcast to other clients
  broadcastToClients(operation);
});
```

**Presence awareness**:

```typescript
// Update presence
await syncEngine.updatePresence({
  userId: 'user123',
  userName: 'John Analyst',
  documentId: 'doc456',
  cursor: {
    position: 42,
    selection: { start: 42, end: 58 }
  },
  viewport: { top: 0, bottom: 1000 },
  status: 'active',
  lastActivity: new Date()
});

// Get all presence info
const presenceList = await syncEngine.getPresence(documentId);
// Shows who's viewing/editing with live cursors
```

**Conflict resolution**:

```typescript
// Automatic conflict resolution
const resolution = await syncEngine.resolveConflict(
  documentId,
  conflictingOps,
  {
    strategy: ConflictResolutionStrategy.LAST_WRITE_WINS
  }
);
```

### 3. Commenting and Annotations

**Thread-based commenting**:

```typescript
import { CommentManager } from '@intelgraph/commenting';

// Create comment thread
const thread = await commentManager.createThread(
  workspaceId,
  'entity',
  entityId,
  userId,
  {
    // Anchor to text selection
    textPosition: {
      start: 100,
      end: 150,
      text: 'suspicious activity'
    }
  }
);

// Add comment with rich text
await commentManager.addComment(
  thread.id,
  userId,
  [
    {
      type: 'paragraph',
      content: 'This entity requires further investigation',
      attributes: { bold: true }
    },
    {
      type: 'mention',
      content: '@john can you review?',
      mentions: [{ userId: 'john123', userName: 'John', position: 0 }]
    }
  ],
  {
    attachments: [{
      id: 'att1',
      name: 'evidence.pdf',
      url: '/files/evidence.pdf',
      type: 'application/pdf'
    }]
  }
);

// Resolve thread
await commentManager.resolveThread(thread.id, userId);
```

**Annotations on maps and graphs**:

```typescript
// Create annotation layer
const layer = await commentManager.createLayer(
  workspaceId,
  resourceId,
  'Investigation Notes',
  userId
);

// Add annotation
const annotation = await commentManager.createAnnotation(
  workspaceId,
  'map',
  mapId,
  userId,
  AnnotationType.CIRCLE,
  {
    x: 100,
    y: 200,
    radius: 50
  },
  {
    layerId: layer.id,
    style: {
      color: '#FF0000',
      opacity: 0.7,
      strokeWidth: 2,
      strokeColor: '#CC0000'
    },
    content: 'Area of interest',
    linkedCommentId: 'comment123'
  }
);
```

**Comment reactions and voting**:

```typescript
// Add reaction
await commentManager.addReaction(commentId, userId, ReactionType.INSIGHTFUL);

// Upvote comment
await commentManager.upvoteComment(commentId, userId);

// Get vote score
const { score, upvotes, downvotes } = await commentManager.getVoteScore(commentId);
```

### 4. Version Control and History

**Git-like version control**:

```typescript
import { VersionControl } from '@intelgraph/version-control';

// Initialize repository
const repo = await versionControl.initRepository(
  workspaceId,
  'analysis',
  analysisId,
  userId
);

// Create branch
const branch = await versionControl.createBranch(
  repo.id,
  'feature-enhanced-analysis',
  mainCommitId,
  userId
);

// Commit changes
const commit = await versionControl.commit(
  repo.id,
  'feature-enhanced-analysis',
  userId,
  'Jane Analyst',
  'Add network analysis section',
  [
    {
      path: 'analysis/network.json',
      type: ChangeType.ADD,
      contentHash: 'abc123',
      diff: '...'
    }
  ],
  {
    description: 'Detailed network analysis with 50+ entities'
  }
);

// Get commit history
const history = await versionControl.getCommitHistory(
  repo.id,
  'main',
  { limit: 20 }
);
```

**Diff and comparison**:

```typescript
// Compare branches
const comparison = await versionControl.compare(
  repo.id,
  'main',
  'feature-enhanced-analysis'
);

console.log(comparison);
// {
//   commits: [commit1, commit2, commit3],
//   diffs: [diff1, diff2],
//   filesChanged: 5,
//   additions: 234,
//   deletions: 12
// }

// View diff
const diffs = await versionControl.diff(
  repo.id,
  fromCommitId,
  toCommitId
);
```

**Merge and conflict resolution**:

```typescript
// Merge branch
const mergeResult = await versionControl.merge(
  repo.id,
  'main',
  'feature-enhanced-analysis',
  userId,
  MergeStrategy.RECURSIVE
);

if (!mergeResult.success) {
  // Handle conflicts
  for (const conflict of mergeResult.conflicts) {
    console.log(`Conflict in ${conflict.path}`);
    // Manual resolution required
  }
}
```

**Blame view**:

```typescript
// Get blame information
const blame = await versionControl.blame(
  repo.id,
  'main',
  'analysis/summary.md'
);

// Shows which commit/author modified each line
for (const line of blame.lines) {
  console.log(`Line ${line.lineNumber}: ${line.content}`);
  console.log(`  Last modified by ${line.authorName} in ${line.commitId}`);
}
```

### 5. Knowledge Base and Documentation

**Wiki-style documentation**:

```typescript
import { CollaborationHub } from '@intelgraph/collaboration';

// Create document
const document = await hub.createDocument(
  workspaceId,
  authorId,
  'Investigation Procedures',
  `# Investigation Procedures

## Overview
Standard operating procedures for...

## Process
1. Initial assessment
2. Evidence collection
3. Analysis
`,
  {
    type: DocumentType.WIKI,
    tags: ['procedures', 'training'],
    parentDocumentId: 'parent-doc-id'
  }
);

// Update document (automatically creates version)
await hub.updateDocument(
  document.id,
  userId,
  {
    content: updatedContent,
    isPublished: true
  }
);

// Search documents
const results = await hub.searchDocuments(
  workspaceId,
  'investigation procedures'
);
```

### 6. Task and Workflow Management

**Kanban boards**:

```typescript
// Create board
const board = await hub.createBoard(
  workspaceId,
  'Investigation Tasks',
  userId,
  {
    type: 'kanban',
    columns: [
      { id: '1', name: 'Backlog', status: TaskStatus.TODO, order: 0 },
      { id: '2', name: 'In Progress', status: TaskStatus.IN_PROGRESS, order: 1 },
      { id: '3', name: 'Review', status: TaskStatus.IN_REVIEW, order: 2 },
      { id: '4', name: 'Done', status: TaskStatus.DONE, order: 3 }
    ]
  }
);

// Create task
const task = await hub.createTask(
  workspaceId,
  board.id,
  reporterId,
  'Analyze financial transactions',
  {
    description: 'Review transactions for entity XYZ',
    assigneeId: analystId,
    priority: TaskPriority.HIGH,
    dueDate: new Date('2024-12-31'),
    labels: ['analysis', 'financial', 'priority']
  }
);

// Update task status
await hub.updateTaskStatus(
  task.id,
  TaskStatus.IN_PROGRESS,
  userId
);
```

### 7. Notifications and Activity Feeds

**Real-time notifications**:

```typescript
// Send notification
await hub.notify(
  userId,
  workspaceId,
  NotificationType.TASK_ASSIGNED,
  'New task assigned',
  'You have been assigned to analyze financial transactions',
  '/tasks/123',
  { taskId: 'task123', priority: 'high' }
);

// Get unread notifications
const unread = await hub.getUnreadNotifications(userId);

// Mark all as read
await hub.markAllNotificationsAsRead(userId);
```

**Activity feed**:

```typescript
// Get activity feed
const activities = await hub.getActivityFeed(
  workspaceId,
  {
    limit: 50,
    offset: 0,
    resourceType: 'analysis'
  }
);

// Activities are automatically logged
// when users perform actions:
// - Create/update/delete resources
// - Comment on items
// - Complete tasks
// - Share resources
```

### 8. Sharing and Permissions

**Share links**:

```typescript
// Create share link
const shareLink = await hub.createShareLink(
  workspaceId,
  'analysis',
  analysisId,
  ShareLinkType.VIEW,
  userId,
  {
    password: 'secret123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    maxUses: 10,
    allowAnonymous: false
  }
);

// Share the link
const shareUrl = `https://intel.app/share/${shareLink.token}`;

// Revoke share link
await hub.revokeShareLink(shareLink.id);
```

### 9. Intelligence Sharing Marketplace

**Publish to marketplace**:

```typescript
// Publish analysis template
const asset = await hub.publishToMarketplace(
  authorId,
  'Financial Crime Investigation Template',
  'Comprehensive template for investigating financial crimes',
  AssetType.TEMPLATE,
  '/assets/template.json',
  {
    category: 'templates',
    tags: ['financial', 'investigation', 'aml'],
    price: 0,
    isPublic: true
  }
);

// Download from marketplace
const contentUrl = await hub.downloadFromMarketplace(
  asset.id,
  userId
);
```

### 10. Video and Audio Collaboration

**Meeting management**:

```typescript
// Schedule meeting
const meeting = await hub.scheduleMeeting(
  workspaceId,
  hostId,
  'Weekly Intelligence Briefing',
  {
    description: 'Review current investigations',
    scheduledAt: new Date('2024-12-20T10:00:00Z'),
    participants: ['user1', 'user2', 'user3']
  }
);

// Start meeting
await hub.startMeeting(meeting.id);

// Meetings support:
// - Video/audio conferencing
// - Screen sharing
// - Recording and transcription
// - Meeting notes
// - Whiteboard integration
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3010/ws');

// Connect to document
ws.send(JSON.stringify({
  type: 'connect',
  userId: 'user123',
  workspaceId: 'ws123',
  documentId: 'doc456',
  permissions: ['read', 'write']
}));

// Receive connection confirmation
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'connected') {
    console.log('Session ID:', message.sessionId);
  }
});
```

### Real-time Operations

```javascript
// Send operation
ws.send(JSON.stringify({
  type: 'operation',
  sessionId: 'session123',
  operation: {
    id: 'op456',
    type: 'insert',
    position: 10,
    content: 'Hello',
    userId: 'user123',
    timestamp: Date.now(),
    version: 5
  }
}));

// Receive operations from other users
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'operation') {
    applyOperation(message.operation);
  }
});
```

### Presence Updates

```javascript
// Send presence update
ws.send(JSON.stringify({
  type: 'presence',
  presence: {
    userId: 'user123',
    userName: 'John Analyst',
    documentId: 'doc456',
    cursor: { position: 42 },
    status: 'active',
    lastActivity: new Date()
  }
}));

// Receive presence from other users
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'presence') {
    updateUserCursor(message.presence);
  }
});
```

## REST API

### Workspaces

```bash
# Create workspace
POST /api/workspaces
{
  "name": "Intelligence Team",
  "ownerId": "user123",
  "description": "Main workspace",
  "slug": "intel-team"
}

# Get workspace
GET /api/workspaces/:id

# List members
GET /api/workspaces/:id/members

# Invite member
POST /api/workspaces/:id/invite
{
  "email": "analyst@agency.gov",
  "role": "member",
  "invitedBy": "user123"
}
```

### Documents

```bash
# Create document
POST /api/documents
{
  "workspaceId": "ws123",
  "authorId": "user123",
  "title": "Investigation Report",
  "content": "# Report...",
  "type": "wiki",
  "tags": ["report", "investigation"]
}

# Update document
PUT /api/documents/:id
{
  "userId": "user123",
  "content": "Updated content..."
}

# Search documents
GET /api/workspaces/:workspaceId/documents/search?q=investigation
```

### Tasks

```bash
# Create board
POST /api/boards
{
  "workspaceId": "ws123",
  "name": "Investigation Tasks",
  "createdBy": "user123",
  "type": "kanban"
}

# Create task
POST /api/tasks
{
  "workspaceId": "ws123",
  "boardId": "board123",
  "reporterId": "user123",
  "title": "Analyze transactions",
  "assigneeId": "analyst456",
  "priority": "high",
  "dueDate": "2024-12-31"
}

# Update task status
PUT /api/tasks/:id/status
{
  "status": "in_progress",
  "userId": "user123"
}
```

## Configuration

### Environment Variables

```bash
# Collaboration Service
PORT=3010
HOST=0.0.0.0
DATABASE_URL=postgresql://user:pass@localhost:5432/intel
REDIS_URL=redis://localhost:6379

# Feature Flags
ENABLE_VIDEO_CONFERENCING=true
ENABLE_MARKETPLACE=true
ENABLE_AI_SUMMARIES=true
```

### Database Schema

The platform requires PostgreSQL with TimescaleDB for time-series data:

```sql
-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id UUID NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents (for knowledge base)
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  title VARCHAR(500) NOT NULL,
  content TEXT,
  author_id UUID NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments
CREATE TABLE comment_threads (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES comment_threads(id),
  author_id UUID NOT NULL,
  content JSONB NOT NULL,
  plain_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES workspaces(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
```

## Best Practices

### 1. Workspace Organization

- Use separate workspaces for different teams or classification levels
- Create projects to organize related analyses
- Set up workspace templates for common use cases

### 2. Real-Time Collaboration

- Implement presence indicators to show active users
- Use operational transformation to handle concurrent edits
- Implement conflict resolution strategies

### 3. Commenting

- Use threaded comments for discussions
- Leverage @mentions to notify specific users
- Resolve threads when issues are addressed

### 4. Version Control

- Commit frequently with descriptive messages
- Use branches for experimental analysis
- Tag important milestones and releases

### 5. Security

- Implement row-level security in PostgreSQL
- Use RBAC for fine-grained permissions
- Audit all access to sensitive resources
- Enable 2FA for workspace owners

## Performance Considerations

### Scaling

- Use Redis for session management and caching
- Implement WebSocket connection pooling
- Use TimescaleDB for time-series activity data
- Consider read replicas for heavy read workloads

### Optimization

- Enable database query caching
- Use indexes on frequently queried fields
- Implement pagination for large result sets
- Use WebSocket compression for large operations

## Troubleshooting

### Common Issues

**WebSocket disconnections:**
```javascript
// Implement reconnection logic
ws.on('close', () => {
  setTimeout(() => reconnect(), 1000);
});
```

**Sync conflicts:**
- Ensure operations include correct version numbers
- Implement conflict detection in UI
- Provide manual resolution options

**Slow queries:**
- Add indexes to frequently queried fields
- Use database connection pooling
- Consider materialized views for complex aggregations

## Integration Examples

### React Integration

```typescript
import { useEffect, useState } from 'react';
import { CollaborationHub } from '@intelgraph/collaboration';

function useCollaboration(documentId: string) {
  const [hub] = useState(() => new CollaborationHub(stores));
  const [presence, setPresence] = useState<Presence[]>([]);

  useEffect(() => {
    // Subscribe to presence updates
    hub.sync.on('presence:updated', ({ presence }) => {
      setPresence(prev => {
        const index = prev.findIndex(p => p.userId === presence.userId);
        if (index >= 0) {
          const next = [...prev];
          next[index] = presence;
          return next;
        }
        return [...prev, presence];
      });
    });

    // Fetch initial presence
    hub.sync.getPresence(documentId).then(setPresence);
  }, [documentId]);

  return { hub, presence };
}
```

## Conclusion

The Collaborative Intelligence Platform provides comprehensive collaboration capabilities rivaling Notion, Confluence, and Palantir Foundry. It supports team-based intelligence analysis with real-time co-editing, commenting, version control, and workflow management.

For more information:
- API Reference: `/docs/api`
- Architecture Guide: `/docs/architecture`
- Security Guide: `/docs/security`
