# IntelGraph Collaboration Client SDK

Easy-to-use JavaScript/TypeScript client for the IntelGraph Collaboration Platform.

## Installation

```bash
npm install @intelgraph/collaboration-client
# or
pnpm add @intelgraph/collaboration-client
```

## Quick Start

```typescript
import { CollaborationClient } from '@intelgraph/collaboration-client';

// Initialize client
const client = new CollaborationClient({
  apiUrl: 'http://localhost:3010',
  wsUrl: 'ws://localhost:3010',
  apiKey: 'your-api-key',
  onError: (error) => console.error('Collaboration error:', error),
  onReconnect: () => console.log('Reconnecting...')
});

// Connect to real-time collaboration
await client.connect(userId, workspaceId, documentId);

// Listen for operations from other users
client.on('operation', (message) => {
  console.log('Operation received:', message.operation);
  applyOperationToEditor(message.operation);
});

// Listen for presence updates
client.on('presence', (message) => {
  console.log('User presence:', message.presence);
  updateCursorPosition(message.presence);
});

// Send operations
client.sendOperation({
  id: 'op123',
  type: 'insert',
  position: 10,
  content: 'Hello',
  userId: 'user123',
  timestamp: Date.now(),
  version: 5
});

// Update your presence
client.updatePresence({ position: 42 }, 'typing');
```

## React Integration

```typescript
import { useEffect, useState } from 'react';
import { CollaborationClient } from '@intelgraph/collaboration-client';

function useCollaboration(userId: string, workspaceId: string, documentId: string) {
  const [client] = useState(() => new CollaborationClient({
    apiUrl: process.env.REACT_APP_API_URL!,
    onError: console.error
  }));

  const [presence, setPresence] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    client.connect(userId, workspaceId, documentId)
      .then(() => setConnected(true))
      .catch(console.error);

    const unsubscribe = client.on('presence', (message) => {
      setPresence(prev => {
        const index = prev.findIndex(p => p.userId === message.presence.userId);
        if (index >= 0) {
          const next = [...prev];
          next[index] = message.presence;
          return next;
        }
        return [...prev, message.presence];
      });
    });

    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, [userId, workspaceId, documentId]);

  return { client, presence, connected };
}

// Usage in component
function CollaborativeEditor({ documentId }: { documentId: string }) {
  const { client, presence, connected } = useCollaboration(
    'user123',
    'workspace456',
    documentId
  );

  return (
    <div>
      <div>Connected: {connected ? 'Yes' : 'No'}</div>
      <div>Active users: {presence.length}</div>
      {presence.map(p => (
        <div key={p.userId}>{p.userName} is {p.status}</div>
      ))}
    </div>
  );
}
```

## API Methods

### Workspaces

```typescript
// Create workspace
const workspace = await client.createWorkspace('My Workspace', userId, {
  description: 'Team workspace',
  slug: 'my-workspace'
});

// Get workspace
const workspace = await client.getWorkspace(workspaceId);

// Invite member
await client.inviteMember(workspaceId, 'user@example.com', 'member', userId);
```

### Documents

```typescript
// Create document
const doc = await client.createDocument(
  workspaceId,
  userId,
  'My Document',
  '# Hello World',
  { type: 'wiki', tags: ['example'] }
);

// Update document
await client.updateDocument(docId, userId, {
  content: '# Updated Content'
});

// Search documents
const results = await client.searchDocuments(workspaceId, 'search query');
```

### Tasks

```typescript
// Create board
const board = await client.createBoard(workspaceId, 'Sprint Board', userId);

// Create task
const task = await client.createTask(
  workspaceId,
  boardId,
  userId,
  'Implement feature X',
  {
    description: 'Add new collaboration features',
    assigneeId: 'analyst123',
    priority: 'high',
    dueDate: new Date('2024-12-31')
  }
);

// Update task status
await client.updateTaskStatus(taskId, 'in_progress', userId);
```

### Comments

```typescript
// Create comment thread
const thread = await client.createCommentThread(
  workspaceId,
  'document',
  documentId,
  userId,
  {
    textPosition: { start: 10, end: 20, text: 'selected text' }
  }
);

// Add comment
await client.addComment(threadId, userId, [
  {
    type: 'paragraph',
    content: 'This needs clarification',
    attributes: { bold: true }
  }
]);

// Add reaction
await client.addReaction(commentId, userId, 'like');
```

### Notifications

```typescript
// Get notifications
const notifications = await client.getNotifications(userId, true); // unread only

// Mark as read
await client.markNotificationAsRead(notificationId);

// Mark all as read
await client.markAllNotificationsAsRead(userId);
```

### Sharing

```typescript
// Create share link
const link = await client.createShareLink(
  workspaceId,
  'document',
  documentId,
  'view',
  userId,
  {
    password: 'secret123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxUses: 10
  }
);

// Get share link info
const linkInfo = await client.getShareLink(token);

// Revoke share link
await client.revokeShareLink(linkId);
```

## Events

Subscribe to real-time events:

- `operation` - Collaborative editing operations
- `presence` - User presence updates
- `notification` - New notifications
- `connected` - Connection established
- `error` - Error occurred

```typescript
const unsubscribe = client.on('operation', (message) => {
  console.log('Operation:', message);
});

// Unsubscribe when done
unsubscribe();
```

## Error Handling

```typescript
const client = new CollaborationClient({
  apiUrl: 'http://localhost:3010',
  onError: (error) => {
    // Handle errors globally
    console.error('Collaboration error:', error);
    showNotification('Connection error occurred');
  },
  onReconnect: () => {
    // Handle reconnection
    console.log('Reconnecting to collaboration server...');
    showNotification('Reconnecting...');
  }
});
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import { CollaborationClient, ClientConfig } from '@intelgraph/collaboration-client';

const config: ClientConfig = {
  apiUrl: 'http://localhost:3010',
  wsUrl: 'ws://localhost:3010',
  apiKey: 'your-api-key'
};

const client = new CollaborationClient(config);
```

## License

MIT
