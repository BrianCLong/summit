# Switchboard Documentation

## Overview

The Switchboard is a centralized dashboard in the Summit Console that provides a real-time overview of the health and status of key subsystems. It allows operators to quickly assess the state of the platform, perform common maintenance actions, and navigate to detailed logs and documentation.

## Extending the Switchboard

The Switchboard is designed to be easily extensible. To add a new subsystem to the dashboard, follow these steps:

1.  **Update the `SystemStatus` type:**
    -   Open `client/src/components/Switchboard/types.ts`.
    -   Add any new properties to the `SystemStatus` interface that are required for your new subsystem.

2.  **Add data to `mockData.ts`:**
    -   Open `client/src/components/Switchboard/mockData.ts`.
    -   Add a new `SystemStatus` object to the `systemStatus` array. This will be used to display the new subsystem on the dashboard.
    -   **TODO:** This data is currently mocked. In the future, it should be fetched from the `/api/switchboard/status` endpoint.

3.  **Update the `SystemStatusCard` component (if necessary):**
    -   If your new subsystem requires a different UI representation, you can update the `client/src/components/Switchboard/SystemStatusCard.tsx` component to handle the new data structure.

## API Assumptions

The Switchboard currently uses mock data, but it is designed to be powered by a backend API. The following endpoints are expected to be available:

-   `GET /api/switchboard/status`: Returns an array of `SystemStatus` objects.
-   `POST /api/switchboard/actions`: Executes an action on a subsystem. The request body should include the `actionId` and any necessary parameters.
