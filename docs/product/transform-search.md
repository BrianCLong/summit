# Transform Search

## Overview

The Transform Search feature provides an efficient way for analysts to discover and execute transforms within the Summit Investigation Workbench. It mirrors the ergonomics of Maltego's transform search but with enhanced filtering and ranking capabilities.

## Features

-   **Keyboard-first UX:** Invoked via Run Panel or shortcut (future).
-   **Instant Filtering:** filters by name, description, and input/output types.
-   **Grouped Results:** Transforms are presented in a flat list (grouped view in roadmap).
-   **Empty State:** Clear feedback when no transforms match the query.

## Usage

1.  Open the Run Panel.
2.  Focus on the search input.
3.  Type keywords (e.g., "IP", "DNS", "Email").
4.  Select a transform from the list to execute (execution logic to be connected).

## API Contract

The frontend consumes the `/api/transforms` endpoint from the Enrichment Service.

### GET /api/transforms

**Response:**

```json
{
  "transforms": [
    {
      "id": "TRANS-001",
      "name": "To IP Address",
      "description": "Resolves a domain to an IP address.",
      "inputTypes": ["Domain"],
      "outputTypes": ["IPv4Address"]
    }
  ]
}
```

## Future Improvements

-   **Ranking:** Implement usage-based ranking (most used transforms appear first).
-   **Favorites:** Allow pinning frequently used transforms.
-   **Shortcuts:** `Ctrl+T` to quick-open transform search.
