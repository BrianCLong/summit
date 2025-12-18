---
name: "A11y Lab manual checklist"
about: "Track manual SR, keyboard, and visual accessibility sweeps for a feature"
title: "[A11y] Manual review - <component/page>"
labels: ["a11y", "manual-check", "privacy"]
---

## Scope
- Feature / page:
- Build / environment:

## Manual runs
- [ ] Screen reader path validated (NVDA/VoiceOver/Narrator)
- [ ] Logical focus order confirmed matches `pnpm --filter @summit/a11y-lab run check:focus-map`
- [ ] No keyboard traps (Tab/Shift+Tab across modals/popovers)
- [ ] Text zoom 200% still readable and functional
- [ ] RTL layout and mirroring verified for critical flows
- [ ] Color/contrast meets budget for all states (default/hover/disabled)
- [ ] No analytics/telemetry attached to content fields (DP guard enforced)

## Notes
- Screenshots, SR transcripts, or video links:
- Risks / follow-ups:

## Sign-off
- Reviewed by:
- Date:
