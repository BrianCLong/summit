# PRD: Auto-Immunizer (Autonomous Ops)

## 1. Executive Summary
Auto-Immunizer provides a "Digital Immune System" that automatically generates and applies temporary security rules (WAF, IP bans, Account locks) based on real-time attack patterns, without human intervention.

## 2. Problem Statement
Human response time to credential stuffing or DDoS is too slow (minutes/hours). We need machine-speed response (milliseconds).

## 3. Non-Goals
- Permanent policy generation (rules are transient).
- Replacing standard WAF (this is a reactive layer).

## 4. User Stories
- As an SRE, I want the system to auto-block a subnet if it generates >50 401 errors in 1 second.
- As a user, I don't want to be locked out by false positives.

## 5. Functional Requirements
- Listen to `AuthFailure` and `RateLimitExceeded` event streams.
- Logic engine to aggregate signals.
- Action effector: `Redis` blocklist or `Nginx` config update.

## 6. Non-Functional Requirements
- Latency from detection to block < 500ms.
- High precision (False Positive Rate < 0.01%).

## 7. Architecture
- `AutoImmunizerService` subscribes to `EventBus`.
- Uses a `TokenBucket` for signal aggregation.
- Pushes rules to `EdgeGateway` (simulated via Redis).

## 8. Data Flows
Event Stream -> Immunizer -> Rule Engine -> Enforcement Point.

## 9. Policy & Governance
- All auto-blocks must expire after T (default 15m).
- "Break-glass" API to flush all auto-rules.

## 10. Test Strategy
- Simulate attack traffic.
- Verify block application.
- Verify expiration.

## 11. Rollout
- "Dry Run" mode (log only) for 1 week.

## 12. Risks
- DoS via spoofed IPs (Self-banning). Mitigation: Whitelist internal/partner ranges.

## 13. Success Metrics
- Reduction in successful credential stuffing attempts.
