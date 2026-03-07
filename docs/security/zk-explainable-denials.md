# Explainable Denials & Responses

**Version:** 1.0
**Status:** DRAFT
**Scope:** User-facing messages for ZK Deconfliction

---

## 1. Philosophy

"Denial" in a ZK system is tricky. We must distinguish between:

1.  **Protocol Denial:** "I won't run this query." (Policy/Security)
2.  **Data Denial:** "I ran the query, but found nothing." (Result)

Crucially, **Data Denial** must not look distinguishable from **Protocol Denial** in timing where possible (mitigate side-channels).

## 2. Response Templates

### 2.1 Scenario: No Overlap Found (The "Happy" Negative)

- **HTTP Status:** `200 OK`
- **Body:**
  ```json
  {
    "status": "success",
    "matches": 0,
    "metadata": {
      "checked_against_count": 4500, // Bucketed (e.g., "4000-5000")
      "noise_added": true
    }
  }
  ```

  - _Note:_ The `checked_against_count` is rounded to significant digits to prevent cardinality leakage.

### 2.2 Scenario: Policy Rejection (Quota Exceeded)

- **HTTP Status:** `429 Too Many Requests`
- **Body:**
  ```json
  {
    "error": "QUOTA_EXCEEDED",
    "message": "Daily deconfliction budget for this coalition partner reached.",
    "reset_at": "2023-10-27T00:00:00Z"
  }
  ```

### 2.3 Scenario: Privacy Budget Exhausted (Differential Privacy)

- **HTTP Status:** `403 Forbidden`
- **Body:**
  ```json
  {
    "error": "PRIVACY_BUDGET_EXHAUSTED",
    "message": "Query rejected to preserve k-anonymity of the target dataset.",
    "resolution": "Try again with a larger query set or wait for budget replenishment."
  }
  ```

  - _Why:_ If you query too many times with slight variations, you can isolate specific items. This error stops that.

### 2.4 Scenario: Low Entropy Input

- **HTTP Status:** `400 Bad Request`
- **Body:**
  ```json
  {
    "error": "LOW_ENTROPY_INPUT",
    "message": "Input set too small or predictable. Minimum set size is 10 items.",
    "code": "ZK_MIN_SET_SIZE_VIOLATION"
  }
  ```

---

## 3. DPIA-Friendly Explanations (For Humans)

When a user asks "Why didn't I get a match?", the system can provide a "Debug Explanation" (only visible to the Querier):

> **"Zero-Knowledge Safety Check"**
>
> Your query was processed successfully. No matches were returned.
>
> - **Technical check:** The cryptographic intersection of your submitted hashes and the partner's hashes was empty.
> - **Privacy Check:** No privacy noise masked a positive result (Confidence: High).
> - **Policy Check:** Your query was fully authorized and executed against the 'Active Investigations' scope.

(This assures the user it wasn't a "silent failure" or a "fake no" due to permissioning).
