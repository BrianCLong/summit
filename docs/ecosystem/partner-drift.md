# Partner Drift Detection & Revocation

**Ecosystem Governance Mechanisms #2 & #3**

## Ecosystem Evidence Attribution

Every external contribution is tagged with:
*   **Provider identity**
*   **Version**
*   **Confidence bounds**
*   **Usage context**

This enables:
*   Provider performance tracking
*   Liability isolation
*   Selective revocation

## Partner Drift Detection

Summit proactively monitors partners for behaviors that degrade trust or attempt to game the system.

### What We Monitor
*   **Claim Inflation**: Consistently reporting higher confidence than justified by outcomes.
*   **Recommendation Bias**: Skewing recommendations towards specific outcomes (especially if incentivized).
*   **Confidence Creep**: Slowly increasing authority claims over time.

### Actions (Without Drama)
*   **Rate-limited**: Slow down their API access.
*   **Sandboxed**: Isolate their inputs so they don't affect decisions.
*   **Temporarily Suspended**: Remove access until reviewed.

## Refusal and Revocation Policy

Summit may revoke or sandbox a partner if:
*   Confidence inflation is detected
*   Claims drift from declared scope
*   Output correlates suspiciously with incentives
*   Partner behavior degrades trust

No negotiation required.
