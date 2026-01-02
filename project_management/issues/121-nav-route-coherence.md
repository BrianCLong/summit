# 121: Navigation & Route Coherence Hardening

Track: UX Navigation
Branch: fix/nav-route-coherence
Labels: area:ux, area:frontend, project:19

## Summary

Audit and harden in-app navigation so every routed surface presents consistent labels, wayfinding, and accessible announcements. Eliminate "Unknown" page states, ensure demo/special-mode routes advertise their purpose, and provide clear recovery actions from dead ends.

## Acceptance Criteria

- App header always renders a human-friendly label for every routed page (including demo/special routes) without falling back to "Unknown".
- Route announcer/a11y metadata includes labels for demo and admin-only routes so screen readers announce correct destinations.
- 404/unknown routes guide users back to the primary workspace with a clear CTA and without exposing raw errors.
- Tests cover at least one previously unlabeled route to prevent regression.

## Dependencies / Notes

- Applies to `client/src/App.router.jsx` routing shell.
- Aligns with Project #19 navigation debt retirement (Sweep 1: Broken Flow & Navigation).
