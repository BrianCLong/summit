# Stub Pages Contract

This document defines the implementation contract for stub pages created to satisfy build-time imports and provide a stable, minimal UI placeholder.

## Contract Requirements

All stub pages MUST adhere to the following contract:

1.  **Default Export**: The file MUST export a default React component.
2.  **No Props**: The component SHOULD NOT expect any props to be passed to it. It should be self-contained.
3.  **Route Params**: The component CAN use the `useParams` hook from `react-router-dom` to access and display route parameters (e.g., `:id`).
4.  **Minimal UI**: The component MUST render a simple, deterministic placeholder. A Material-UI `<Card>` is preferred for consistency.
5.  **Clear Identification**: The placeholder MUST clearly identify:
    - The name of the page.
    - Any route parameters it has received.
    - A "Not Implemented" or "Stub Page" message.
6.  **No Side Effects**: The component MUST NOT perform any data fetching, interact with browser storage, or depend on environment variables.

## Example Implementation

This example demonstrates a compliant stub page for a "detail" view that expects an `id` route parameter.

```jsx
import React from "react";
import { Card, CardContent, Typography } from "@mui/material";
import { useParams } from "react-router-dom";

export default function ExampleDetailPage() {
  const { id } = useParams();

  return (
    <Card sx={{ m: 2, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h4">Example Detail Page</Typography>
        <Typography variant="h6">Item ID: {id}</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          This is a stub page for displaying item details.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          (Not Implemented)
        </Typography>
      </CardContent>
    </Card>
  );
}
```

## Affected Stub Pages

The following pages were identified as stubs and have been updated or created to conform to this contract:

| Path                                             | Route Parameter(s) | Status                     |
| :----------------------------------------------- | :----------------- | :------------------------- |
| `client/src/pages/Hunting/HuntList.tsx`          | None               | Refactored to minimal stub |
| `client/src/pages/Hunting/HuntDetail.tsx`        | `:id`              | Created as minimal stub    |
| `client/src/pages/IOC/IOCList.tsx`               | None               | Refactored to minimal stub |
| `client/src/pages/IOC/IOCDetail.tsx`             | `:id`              | Refactored to minimal stub |
| `client/src/pages/Search/SearchHome.tsx`         | None               | Refactored to minimal stub |
| `client/src/pages/Search/SearchResultDetail.tsx` | `:id`              | Created as minimal stub    |
