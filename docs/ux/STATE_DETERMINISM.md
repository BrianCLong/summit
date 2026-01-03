# State Determinism Contract

This document outlines the standard patterns and rules for managing UI state and asynchronous operations in the Summit platform's frontend (`client/`). Adhering to this contract ensures a deterministic, predictable, and race-free user experience.

## Core Principles

1.  **Stale Requests Must Be Ignored**: A response from an old request must never overwrite the state derived from a more recent request.
2.  **Navigation Cancels In-Flight Operations**: When a user navigates away from a view, any in-flight data requests initiated by that view should be cancelled.
3.  **Server Cache is the Single Source of Truth for Remote Data**: All remote data (from the GraphQL API) must be managed by a centralized server cache. Do not store server data in separate, disconnected state management libraries.
4.  **UI State is Explicitly Managed**: The state of the UI (loading, empty, error, success) must be derived directly from the state of the underlying data-fetching mechanism.

## Request Lifecycle Rules

### 1. Cancellation & Stale Response Protection

-   **Apollo Client**: All GraphQL queries and mutations automatically handle stale response protection via their internal request tracking. For component-level data fetching, use Apollo's `useQuery` and `useMutation` hooks, which manage the request lifecycle.
-   **Manual `fetch` Requests**: For any non-GraphQL `fetch` calls (e.g., REST endpoints, file uploads), an `AbortController` **must** be used. The signal should be passed to `fetch`, and the `abort()` method must be called in the `useEffect` cleanup function to cancel the request when the component unmounts or a dependency changes.

    ```javascript
    useEffect(() => {
      const controller = new AbortController();
      const signal = controller.signal;

      fetch('/api/data', { signal })
        .then(response => response.json())
        .catch(err => {
          if (err.name === 'AbortError') {
            console.log('Fetch aborted');
          }
        });

      return () => {
        controller.abort();
      };
    }, [dependency]);
    ```

### 2. Retry & Backoff Policy

-   **Apollo Client**: The default `errorPolicy` is sufficient for most cases. For critical queries that require retries, use a dedicated link like `@apollo/client/link/retry` in the Apollo Client setup. Do not implement manual retry loops in components.
-   **Manual `fetch`**: UI-initiated retries should be idempotent. Avoid patterns that could trigger duplicate mutations. A simple "Try Again" button that re-triggers the original fetching logic is the standard.

## Cache Invalidation Rules

1.  **Authentication/Session Changes**: On user login or logout, the Apollo Client cache **must** be completely cleared to prevent data leakage between sessions. Call `client.clearStore()` during the auth transition.
2.  **Tenant/Context Changes**: When the user switches their active tenant or a similar high-level context, the cache must be cleared via `client.clearStore()`.
3.  **Post-Mutation Updates**: After a mutation (create, update, delete), the cache must be updated to reflect the change. Prefer using `refetchQueries` to re-fetch affected list views. For complex updates, the `update` function can be used to manually modify the cache.

## Standard Patterns by Library

This project uses three primary state management tools. Use the right tool for the job.

### 1. Apollo Client (`@apollo/client`)

-   **Purpose**: The **only** tool for managing server state (data fetched from the GraphQL API).
-   **Use For**: All GraphQL queries, mutations, subscriptions, and the corresponding server data cache.
-   **Do Not Use For**: Global UI state like theme preferences, notification message state, or multi-step form data.

### 2. Redux Toolkit (`@reduxjs/toolkit`)

-   **Purpose**: Managing complex, global, or cross-cutting UI state that is **not** server data.
-   **Use For**:
    -   Session/user information (e.g., roles, preferences).
    -   State for complex, multi-step workflows or forms that need to persist across views.
    -   Application-level settings (e.g., theme, language).

### 3. Zustand

-   **Purpose**: Managing simple, transient, or co-located UI state that does not justify the boilerplate of Redux.
-   **Use For**:
    -   Visibility state for modals, drawers, or popovers.
    -   Managing notifications or alerts.
    -   Simple form state that needs to be shared between a few non-nested components.
