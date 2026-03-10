# Summit CLI Interoperability Standard

This document outlines the standard mapping between external systems (e.g., VS Code agent plugins) and Summit's native architecture.

## Import/Export Matrix

| External Construct | Summit Construct | Support Level |
|---|---|---|
| VS Code agent plugin bundle | Summit agent bundle metadata | Ideas/config mapping only. Not raw code copy. |
| MCP server references | Summit tool connectors | Reference-level integration |
| Git marketplace source | Summit marketplace registry source | Supported |
| VS Code extension UX | Summit CLI verbs | Inspiration only |

## Non-Goals
- Full VS Code extension runtime compatibility
- Full cloud marketplace UI
- Agent monetization in initial CLI slice
- Raw proprietary marketplace mirroring
