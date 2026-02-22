# Async MCP Operations (Tasks)

Summit implements MCP SEP-1686 Tasks to support long-running operations without blocking the agent loop.

## Overview

MCP Tasks allow a client to initiate an operation and receive a `taskId` instead of a direct result. The client can then poll for status or wait for notifications.

### Feature Flags

- `SUMMIT_MCP_TASKS`: Enable/Disable task augmentation in the client. Default: `0` (Disabled).
- `SUMMIT_BG_JOBS`: Enable/Disable background job processing for tasks. Default: `0` (Disabled).

## Usage (Client)

The Summit MCP Client automatically handles task augmentation if enabled.

```typescript
import { mcp } from "@intelgraph/mcp";

// Standard call - might upgrade to task transparently if supported/configured
const result = await mcp.callWithTask("tool/name", { arg: 1 });
```
