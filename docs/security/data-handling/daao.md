# DAAO Data Handling & Security

## Data Classification
| Data Type | Classification | Handling |
|-----------|----------------|----------|
| User Query | Confidential | Do not log raw text in permanent artifacts. |
| Difficulty Score | Public/Internal | Safe to log. |
| Routing Decision | Public/Internal | Safe to log (model ID, cost). |
| Critique | Confidential | Treated same as User Query (may contain derivatives). |

## Retention Policy
- **Metrics**: Indefinite (anonymized).
- **Debug Logs**: 7 days (if enabled).
- **Critique Artifacts**: Transient only, unless explicit "trace mode" is enabled for debugging.

## Never Log
- Raw user query in `daao-drift.json` or other permanent monitoring artifacts.
- API Keys (obviously).
