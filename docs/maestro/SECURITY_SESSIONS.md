# Security and Session Management in Maestro UI

This document details the security considerations and session management strategies employed within the Maestro UI, focusing on idle timeouts, token refresh mechanisms, and data storage.

## Idle Timeout Semantics

To enhance security and prevent unauthorized access from unattended sessions, Maestro UI implements an idle timeout mechanism:

*   **Timeout Duration:** User sessions will automatically log out after **15 minutes** of inactivity.
*   **Activity Detection:** User activity is detected by common browser events such as `mousemove`, `keydown`, `click`, and `scroll`.
*   **Timer Reset:** Any detected user activity resets the idle timer.
*   **Logout Action:** Upon timeout, the user is automatically logged out, and their session is cleared. This involves calling the backend logout endpoint to invalidate the server-side session and clearing all local authentication state.

## Proactive Token Refresh

Maestro UI employs a proactive token refresh strategy to maintain continuous user sessions without requiring re-authentication, while also ensuring that access tokens are short-lived for security:

*   **Refresh Schedule:** The UI schedules a token refresh operation approximately **60 seconds before** the current access token's `expiresAt` timestamp.
*   **Jitter:** A small random jitter (up to 10 seconds) is added to the refresh schedule to prevent thundering herd problems on the authentication server.
*   **Concurrent Refresh Guard:** Mechanisms are in place to prevent multiple concurrent token refresh requests, ensuring only one refresh operation is active at a time.
*   **Failure Handling:** If a token refresh attempt fails (e.g., due to an invalid refresh token or a 401 Unauthorized response from the backend), the user is automatically logged out. This ensures that compromised or expired refresh tokens do not lead to persistent unauthorized access.

## Storage Strategy

Maestro UI adheres to a strict policy of minimal and secure storage of authentication-related data:

*   **Access Token and ID Token:** These tokens are stored **in memory only** within the React application's state (specifically, within the `AuthContext`). They are never persisted to `localStorage`, `sessionStorage`, or cookies by the UI itself.
*   **Session Pointer (Backend-Managed):** The primary user session is managed by the backend gateway. This is ideally done using **HTTP-only, Secure cookies**. These cookies are automatically sent with every request to the backend and are inaccessible to client-side JavaScript, significantly mitigating Cross-Site Scripting (XSS) attacks.
*   **PKCE Code Verifier and State:** During the OIDC Authorization Code Flow with PKCE, the `code_verifier` and `state` parameters are temporarily stored in `sessionStorage`. These values are immediately cleared from `sessionStorage` once they have been used in the token exchange process (i.e., after the `AuthCallback` component processes the redirect).

## Threat Model Notes

This session management strategy is designed to mitigate common web application security threats:

*   **Cross-Site Scripting (XSS):** By storing access tokens in memory and relying on HTTP-only cookies for session management, the impact of XSS vulnerabilities is significantly reduced. An attacker injecting malicious JavaScript cannot directly access the user's access token or session cookie.
*   **Cross-Site Request Forgery (CSRF):** The use of secure, HTTP-only cookies (managed by the backend) and the OIDC `state` parameter (for CSRF protection during the authorization flow) helps protect against CSRF attacks.
*   **Session Hijacking:** Short-lived access tokens, proactive refresh, and idle timeouts reduce the window of opportunity for session hijacking. The backend's robust session management (e.g., invalidating sessions on logout, detecting unusual activity) further enhances protection.
*   **Open Redirects:** The OIDC `redirect_uri` is strictly validated by the OIDC provider and the backend gateway, preventing malicious open redirect vulnerabilities.

By combining these strategies, Maestro UI aims to provide a secure and robust authentication and session management experience for its users.
