# UX Governance Compliance Check

Before submitting this PR, ensure compliance with the authoritative UX doctrine.

## Core Principles Verification

- [ ] **Human Primacy**: All consequential decisions require human authorization
- [ ] **Security-First**: Security and compliance override convenience and performance
- [ ] **Stress-Resilient Design**: Interface functions under high cognitive load
- [ ] **Total Transparency**: All system decisions are fully explainable
- [ ] **Accessibility Always**: WCAG 2.1 AA compliance maintained

## Critical Action Pattern

If this PR introduces or modifies any critical operations, verify:

- [ ] Visual separation from routine operations
- [ ] Multi-step confirmation process (at least 2 steps with 1-second delay)
- [ ] Clear indication of potential consequences
- [ ] Immutable logging of the operation

## Accessibility Compliance

- [ ] All new UI elements have proper ARIA labels and roles
- [ ] Keyboard navigation works for all interactive elements
- [ ] Sufficient color contrast (WCAG AA minimum)
- [ ] Screen reader compatibility tested
- [ ] Focus management implemented correctly

## Design System Consistency

- [ ] Using standardized design system components (Radix + Tailwind)
- [ ] Consistent color, typography, and spacing patterns
- [ ] No mixed design system usage (MUI + Radix/Tailwind)

## Information Hierarchy

- [ ] Dashboard information has clear visual priority
- [ ] Critical information is distinguishable from routine data
- [ ] No information overload on single screens

## Emergency Interface Considerations

- [ ] Changes maintain emergency/stress-resilient interface capability
- [ ] High-contrast mode supported
- [ ] Large touch targets for high-stress use
- [ ] Minimal options to reduce cognitive load

## UX Decision Reference

List any UX decisions from the canonical register that this PR addresses:

- UX-XXX: [Issue description and how it's addressed]

## Stakeholder Approval

If this PR affects P0 or P1 UX issues, attach stakeholder approval or link to approved design documentation.

---

_This PR template ensures compliance with the IntelGraph/Summit UX governance doctrine. All UX changes must pass these checks before merging._
