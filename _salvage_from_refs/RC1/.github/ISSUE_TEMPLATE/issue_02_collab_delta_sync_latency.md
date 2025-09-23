---
name: "Issue #2: Real-Time Collaboration Delta Sync Latency"
about: Reduce latency in collaborative annotation syncing
title: "Issue #2: Real-Time Collaboration Delta Sync Latency"
labels: "bug, performance, collaboration, backend, frontend"
assignees: ""
---

**Branch**: `feature/collab-delta-sync`

**Status**: Open

**Description**
Collaborative editing of graph annotations (tags, highlights) suffers from significant latency spikes. Deltas (changes) can take up to 500ms to sync across collaborators, leading to inconsistent states, race conditions, and a frustrating user experience. This undermines the real-time collaborative features of IntelGraph.

**Proposed Solution**
Implement a more efficient delta synchronization mechanism, potentially leveraging WebSockets for immediate push notifications and a lightweight conflict resolution strategy (e.g., last-write-wins for simple annotations, or a basic operational transform for more complex changes).

**Code/File Layout**

```
backend/
  websocket/
    collab_ws.py
  api/
    annotations.py
frontend/
  collab/
    delta-sync.js
    annotation-client.js
tests/
  integration/
    test_collab_sync.py
```

**Python Stub (`collab_ws.py` - Backend WebSocket):**

```python
# backend/websocket/collab_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
from typing import Dict, List

router = APIRouter()

# In-memory store for active connections and graph states (for simplicity)
active_connections: Dict[str, List[WebSocket]] = {}
graph_annotations: Dict[str, Dict] = {} # Stores current state of annotations per graph

@router.websocket("/ws/collaborate/{graph_id}")
async def websocket_endpoint(websocket: WebSocket, graph_id: str):
    await websocket.accept()
    if graph_id not in active_connections:
        active_connections[graph_id] = []
        graph_annotations[graph_id] = {} # Initialize annotations for new graph
    active_connections[graph_id].append(websocket)
    print(f"Client connected to graph {graph_id}. Total: {len(active_connections[graph_id])}")

    try:
        # Send initial state to new client
        await websocket.send_json({"type": "initial_state", "data": graph_annotations[graph_id]})

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            print(f"Received message for {graph_id}: {message}")

            if message["type"] == "annotation_update":
                # Apply update (simple last-write-wins for now)
                annotation_id = message["payload"]["id"]
                graph_annotations[graph_id][annotation_id] = message["payload"]

                # Broadcast to all other connected clients for this graph
                for connection in active_connections[graph_id]:
                    if connection != websocket: # Don't send back to sender
                        await connection.send_json(message)

    except WebSocketDisconnect:
        active_connections[graph_id].remove(websocket)
        print(f"Client disconnected from graph {graph_id}. Remaining: {len(active_connections[graph_id])}")
    except Exception as e:
        print(f"WebSocket error for {graph_id}: {e}")
```

**jQuery/JS Stub (`delta-sync.js` - Frontend WebSocket Client):**

```js
// frontend/collab/delta-sync.js
class CollaborationClient {
    constructor(graphId, onUpdateCallback) {
        this.graphId = graphId;
        this.onUpdateCallback = onUpdateCallback;
        this.ws = null;
        this.connect();
    }

    connect() {
        const wsUrl = `ws://localhost:8000/ws/collaborate/${this.graphId}`; // Adjust URL
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log(`Connected to collaboration server for graph ${this.graphId}`);
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);
            if (message.type === 'initial_state') {
                // Apply initial state
                this.onUpdateCallback(message.data, true);
            } else if (message.type === 'annotation_update') {
                // Apply delta update
                this.onUpdateCallback(message.payload, false);
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from collaboration server. Reconnecting in 5s...');
            setTimeout(() => this.connect(), 5000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    sendAnnotationUpdate(annotationData) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'annotation_update',
                payload: annotationData
            }));
        } else {
            console.warn('WebSocket not open. Cannot send update.');
        }
    }
}

// Example usage in annotation-client.js
// const collabClient = new CollaborationClient('my-graph-123', (data, isInitial) => {
//     if (isInitial) {
//         // Render all initial annotations
//         console.log('Initial annotations:', data);
//     } else {
//         // Apply single annotation update
//         console.log('Annotation updated:', data);
//     }
// });

// When a user makes a change:
// collabClient.sendAnnotationUpdate({ id: 'tag-1', text: 'New Tag', color: 'red' });
```

**Architecture Sketch (ASCII)**

```
+-------------------+       +-------------------+       +-------------------+
|  Client A (UI)    |       |  Backend Server   |       |  Client B (UI)    |
| (annotation-client.js) |       | (collab_ws.py)    |       | (annotation-client.js) |
+-------------------+       +-------------------+       +-------------------+
        |                       ^       ^                       |
        | Annotation Update     |       | Annotation Update     |
        | (WebSocket)           |       | (WebSocket)           |
        +---------------------->|       |<----------------------+
                                |       |
                                |       | Broadcast
                                |       |
                                +-------+
                                |
                                | Graph State
                                | (e.g., in-memory, Redis, DB)
                                v
                          +-------------+
                          | Data Store  |
                          +-------------+
```

**Sub-tasks:**
- [ ] Implement a WebSocket server endpoint in the backend (`collab_ws.py`) to handle real-time connections.
- [ ] Develop a WebSocket client in the frontend (`delta-sync.js`) to connect and send/receive annotation deltas.
- [ ] Define a clear message format for annotation updates (e.g., `type`, `payload`).
- [ ] Implement a basic conflict resolution strategy on the backend (e.g., last-write-wins for simple properties).
- [ ] Integrate the `CollaborationClient` with existing annotation components in the frontend.
- [ ] Add robust error handling and reconnection logic for WebSocket connections.
- [ ] Write integration tests to simulate multiple clients and measure sync latency.
