# Web Platform API Compatibility Matrix

## Compatibility Classes

- **universal-ish**: broadly available in modern evergreen browsers.
- **chromium-centric**: limited support, usually Chromium-first; requires fallback.

## Matrix

| API | Class | Default posture | Fallback requirement |
| --- | --- | --- | --- |
| `structuredClone` | universal-ish | Allowed | Polyfill helper or JSON-safe clone fallback |
| `Performance` API | universal-ish | Allowed | No-op wrapper for non-browser/test runtime |
| `Page Visibility` | universal-ish | Allowed | Graceful no-op listener wrapper |
| `ResizeObserver` | universal-ish | Allowed | `window.onresize` fallback where practical |
| `IntersectionObserver` | universal-ish | Allowed | scroll/resize throttled fallback |
| `AbortController` | universal-ish | Allowed | explicit cancellation token fallback |
| `BroadcastChannel` | universal-ish | Allowed | localStorage event fallback or no-op |
| `Idle Detection` | chromium-centric | Default OFF | must return unsupported without side effects |
| `Web Locks` | chromium-centric | Default OFF | cooperative in-memory lock fallback |
| `File System Access` | chromium-centric | Default OFF | upload/download fallback only |

## Hard Rules

1. Chromium-centric APIs must be feature detected at call time (no top-level global access).
2. Chromium-centric APIs must return typed unsupported errors when unavailable.
3. Permissioned APIs must never prompt in background flows.
4. All wrappers must include deny-by-default tests:
   - negative fixture (API absent)
   - positive fixture (API present)
