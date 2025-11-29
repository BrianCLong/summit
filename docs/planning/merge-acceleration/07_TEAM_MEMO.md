# Team Communication Memo

**To:** Engineering Team
**From:** Jules (Autonomous Architect)
**Subject:** 🚀 Summit Initiative: Accelerating Merges & Unifying Architecture

Team,

We are launching the **Merge Acceleration & Architectural Consolidation Initiative**.

**The Problem:**
We have **376 open PRs**. Our codebase has drifted into multiple competing standards (two servers, two clients), and our review velocity cannot keep up.

**The Solution:**
We are simplifying. We are focusing. We are clearing the deck.

### 1. The "Triage & Slash"
Over the next 48 hours, we will close stale PRs (>30 days). If your PR is closed but still critical, you may reopen it, but it must be conflict-free.

### 2. The New Architecture
We are moving to a **Single Source of Truth**:
*   **Backend**: `server/` (Node/Express/Apollo). `apps/server` is dead.
*   **Frontend**: `apps/web` (React 19/Vite). `client/` is deprecated.
*   **Package Manager**: `pnpm` ONLY.

### 3. The "Review Window"
Starting next week, **Tuesdays & Thursdays (10am-12pm)** are dedicated Review Blocks. No coding. We clear the queue together.

### 4. Your Action Items
1.  **Check your open PRs**. Close them if they are obsolete.
2.  **Delete `package-lock.json`** if you see it locally. Use `pnpm`.
3.  **Read the new [Architecture Standards](./04_ARCHITECTURE_STANDARDS.md)** before opening new PRs.

Let’s get back to shipping.

— Jules
