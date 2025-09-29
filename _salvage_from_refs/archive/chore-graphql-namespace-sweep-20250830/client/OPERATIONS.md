# Client Operations Playbook

This document outlines the operational aspects for the client-side of the IntelGraph platform, focusing on feature flags, canary deployments, monitoring, and runbooks.

## Feature Flags

Feature flags allow for controlled rollout and A/B testing of new functionalities. They are typically configured via environment variables or a dedicated feature flag service.

*   **`ASSISTANT_ENABLED`**: Controls the visibility and functionality of the AI Assistant.
    *   `true`: Assistant is fully enabled.
    *   `false`: Assistant is disabled.
*   **`ASSISTANT_VOICE`**: Enables/disables voice input capabilities for the AI Assistant.
    *   `true`: Voice input is enabled.
    *   `false`: Voice input is disabled.
*   **`AI_SUGGESTIONS_REVIEW_UI`**: Controls the visibility of the AI Suggestions review panel.
    *   `true`: Review UI is visible.
    *   `false`: Review UI is hidden.

## Canary Gates

Canary deployments are used to gradually roll out new features or updates to a small subset of users before a full rollout. This allows for early detection of issues with minimal impact.

Rollout phases and associated SLOs (Service Level Objectives) for the AI Assistant:

*   **5% Canary**: Initial small rollout to a controlled user group.
    *   **SLO Guards (auto-rollback triggers)**:
        *   p95 Time To First Byte (TTFB) > 500 ms
        *   p95 Time To Done (TTD) > 2.5 s
        *   Error rate > 1% / 5 minutes per tenant
        *   Worker failures > 0.5% / 5 minutes
*   **25% Ramp-up**: Increased exposure to a larger user group.
    *   Same SLO Guards as 5% Canary.
*   **100% Full Rollout**: Feature is available to all users.
    *   Same SLO Guards as 5% Canary.

Monitoring dashboards should be actively observed during each phase to ensure SLOs are met. Automated alerts are configured to trigger rollbacks if SLOs are violated.

## Dashboards

Key metrics to monitor for the AI Assistant and related services:

*   **Latency**: p95 TTFB, p95 TTD for `/assistant/*` endpoints.
*   **Errors**: Error rates for `/assistant/*` endpoints, broken down by path and error code.
*   **Tokens**: Total tokens streamed, broken down by transport mode (fetch, SSE, Socket.IO).
*   **Cache Hit-Rate**: Percentage of responses served from cache.
*   **Enrichment Queue Depth**: Number of pending jobs in the `assistant:enrich` queue.
*   **Suggestion Funnel**: Count of suggestions created, accepted, and rejected.

## Runbooks (Client-Specific)

This section outlines procedures for common operational scenarios related to the client-side AI Assistant.

*   **Scenario: AI Assistant UI is unresponsive/frozen.**
    1.  **Check Browser Console**: Look for JavaScript errors or network request failures.
    2.  **Verify `VITE_API_BASE`**: Ensure the client is pointing to the correct API endpoint.
    3.  **Check `VITE_ASSISTANT_TRANSPORT`**: Confirm the chosen transport mode is correctly configured and supported by the backend.
    4.  **Inspect Network Tab**: Verify assistant requests are being sent and receiving responses (check status codes, response times).
    5.  **Toggle Feature Flags**: Temporarily disable `ASSISTANT_ENABLED` or `ASSISTANT_VOICE` to isolate the issue.
    6.  **Clear Local Storage**: Remove `ig_jwt` and any other relevant client-side cached data.
    7.  **Escalate**: If the issue persists, check server-side logs and metrics.

*   **Scenario: Voice input is not working.**
    1.  **Check `ASSISTANT_VOICE` flag**: Ensure it's enabled.
    2.  **Browser Permissions**: Verify microphone access is granted to the site.
    3.  **Browser Compatibility**: Confirm `SpeechRecognition` API is supported by the user's browser.
    4.  **Network Connectivity**: Ensure stable internet connection for voice processing (if external service).
    5.  **Check `console.error`**: Look for any errors related to `SpeechRecognition` or `MediaRecorder` mocks in test environments.

*   **Scenario: AI Suggestions panel is empty or not updating.**
    1.  **Check `AI_SUGGESTIONS_REVIEW_UI` flag**: Ensure it's enabled.
    2.  **Inspect Network Tab**: Verify GraphQL queries to `/graphql` for `suggestions` are successful.
    3.  **Check Backend Logs**: Look for errors in the enrichment worker or GraphQL resolver for suggestions.
    4.  **Verify Neo4j Connectivity**: Ensure the backend can connect to Neo4j and query `AISuggestion` nodes.
    5.  **Check Enrichment Queue**: See if `assistant:enrich` queue has pending or failed jobs.

## Contact

For critical issues, refer to the on-call rotation and escalation matrix. For general inquiries, contact the IntelGraph SRE team.
