# War Room WebSocket Events

This document outlines the WebSocket events related to the War Room feature.

## Events

### `joinRoom`

- **Description**: Sent by the client when a user joins a War Room.
- **Payload**:
  - `userId`: The ID of the user who joined.
  - `warRoomId`: The ID of the War Room that was joined.

### `leaveRoom`

- **Description**: Sent by the client when a user leaves a War Room.
- **Payload**:
  - `userId`: The ID of the user who left.
  - `warRoomId`: The ID of the War Room that was left.

## Server-Sent Events

The server will broadcast the following events to all clients in a War Room:

### `notification`

- **Description**: A general-purpose event for sending notifications to the client.
- **Payload**:
  - `type`: The type of notification (e.g., `USER_JOINED`, `USER_LEFT`).
  - `message`: A human-readable message to be displayed to the user.
