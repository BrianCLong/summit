---
id: bug-fix
name: Bug Fix Template
version: 1.0.0
category: core
type: bug-fix
description: Systematic approach to identifying, fixing, and preventing bugs
author: IntelGraph Team
lastUpdated: 2025-11-27T00:00:00Z
tags:
  - bug
  - fix
  - debugging
  - quality
metadata:
  priority: P2
  estimatedTokens: 1500
  complexity: moderate
variables:
  - name: bugTitle
    type: string
    description: Bug title
    required: true
    prompt: "Bug title?"
  - name: bugDescription
    type: multiline
    description: Detailed bug description
    required: true
    prompt: "Describe the bug in detail:"
  - name: stepsToReproduce
    type: multiline
    description: Steps to reproduce
    required: true
    prompt: "Steps to reproduce (one per line):"
  - name: expectedBehavior
    type: string
    description: Expected behavior
    required: true
    prompt: "What should happen?"
  - name: actualBehavior
    type: string
    description: Actual behavior
    required: true
    prompt: "What actually happens?"
  - name: severity
    type: string
    description: Bug severity
    default: medium
    validation:
      enum: [critical, high, medium, low]
    prompt: "Severity (critical/high/medium/low)?"
  - name: frequency
    type: string
    description: How often the bug occurs
    default: sometimes
    validation:
      enum: [always, often, sometimes, rarely]
    prompt: "Frequency (always/often/sometimes/rarely)?"
  - name: affectedArea
    type: string
    description: Affected area/component
    required: true
    prompt: "Affected area? (e.g., 'Auth service', 'Graph visualization')"
  - name: errorMessages
    type: multiline
    description: Error messages or logs
    default: "None captured"
    prompt: "Error messages or relevant logs?"
  - name: environment
    type: string
    description: Environment where bug occurs
    default: "production, staging, development"
    prompt: "Environment(s)? (e.g., 'production, staging')"
---
# 🐛 Bug Fix — Systematic Debugging & Resolution

## Role

You are a senior software engineer specializing in debugging and root cause analysis. Your task is to systematically identify, fix, and prevent the recurrence of this bug.

---

## 1. Bug Report

### Title
**{{bugTitle}}**

### Description
{{bugDescription}}

### Reproduction Steps
{{stepsToReproduce}}

### Expected vs Actual Behavior
* **Expected**: {{expectedBehavior}}
* **Actual**: {{actualBehavior}}

### Severity & Frequency
* **Severity**: {{severity}}
* **Frequency**: {{frequency}}
* **Affected Area**: {{affectedArea}}
* **Environment**: {{environment}}

### Error Messages / Logs
```
{{errorMessages}}
```

---

## 2. Debugging Methodology

Follow this systematic approach:

### Step 1: Reproduce

1. **Reproduce the bug locally**
   * Follow the exact reproduction steps
   * Document any deviations or additional findings
   * Capture logs, network traffic, state

2. **Isolate the conditions**
   * What triggers it? (specific input, timing, state)
   * What doesn't trigger it? (variations that work)
   * Is it deterministic or intermittent?

### Step 2: Investigate

1. **Examine the stack trace**
   * Identify the error origin
   * Trace backwards to find the root cause
   * Check for cascading failures

2. **Review relevant code**
   * Read the code path that leads to the bug
   * Check recent changes (git blame, git log)
   * Look for similar patterns in the codebase

3. **Check assumptions**
   * Are there invalid assumptions in the code?
   * Are there unhandled edge cases?
   * Is there missing validation?

4. **Verify data flow**
   * Check inputs at each step
   * Verify transformations
   * Validate outputs

### Step 3: Root Cause Analysis

1. **Identify the root cause** (not just symptoms)
   * What is the fundamental problem?
   * Why did it happen?
   * What allowed it to happen?

2. **Classify the bug type**
   * Logic error
   * Race condition
   * Memory leak
   * Resource exhaustion
   * Configuration issue
   * Dependency bug
   * Integration failure
   * Data corruption
   * Other: _______

3. **Assess impact**
   * How many users are affected?
   * What functionality is broken?
   * Are there security implications?
   * Is data at risk?

### Step 4: Fix Design

1. **Design the fix**
   * What needs to change?
   * What are the alternatives?
   * What are the trade-offs?

2. **Consider side effects**
   * Will this break anything else?
   * Are there performance implications?
   * Does this require a migration?

3. **Plan for prevention**
   * What tests will prevent regression?
   * What monitoring will detect recurrence?
   * What process changes are needed?

---

## 3. Implementation Requirements

### The Fix

1. **Minimal, surgical change**
   * Fix only what's broken
   * Don't refactor unless necessary
   * Keep the change small and focused

2. **Proper error handling**
   * Add missing validation
   * Handle edge cases
   * Provide clear error messages

3. **Code quality**
   * Follow CLAUDE.md conventions
   * Add comments explaining the fix
   * Update relevant documentation

### Testing

1. **Regression test**
   * Write a test that reproduces the bug
   * Verify it fails before the fix
   * Verify it passes after the fix

2. **Edge case tests**
   * Test boundary conditions
   * Test error paths
   * Test concurrent scenarios (if relevant)

3. **Integration tests**
   * Verify the fix doesn't break related functionality
   * Test the full user flow

### Prevention

1. **Monitoring & Alerting**
   * Add metrics to track the issue
   * Set up alerts for recurrence
   * Add logging for visibility

2. **Process improvements**
   * Update testing guidelines
   * Add validation checks
   * Update code review checklist

---

## 4. Deliverables

### A. Root Cause Analysis

```markdown
## Root Cause Analysis: {{bugTitle}}

### Reproduction
[How you reproduced it]

### Investigation
[What you found during investigation]

### Root Cause
[The fundamental problem]

### Impact Assessment
[Who/what is affected]

### Fix Strategy
[How you'll fix it]
```

### B. Code Changes

For each file:
1. File path
2. Description of change
3. Full content (using Edit tool)
4. Explanation of why this fixes the bug

### C. Test Suite

1. **Regression test** (proves bug is fixed)
2. **Edge case tests**
3. **Integration tests**
4. Test execution proof

### D. Prevention Measures

1. **Monitoring**
   * Metrics added
   * Alerts configured
   * Logs enhanced

2. **Process**
   * Guidelines updated
   * Checklist items added
   * Documentation improved

---

## 5. Verification Checklist

* [ ] Bug reproduced locally
* [ ] Root cause identified and documented
* [ ] Fix implemented with minimal changes
* [ ] Regression test added (fails before fix, passes after)
* [ ] Edge cases tested
* [ ] Integration tests pass
* [ ] No new bugs introduced
* [ ] Code reviewed and follows conventions
* [ ] Documentation updated
* [ ] Monitoring/alerting added
* [ ] All tests pass (`pnpm test`)
* [ ] Smoke tests pass (`make smoke`)
* [ ] CI pipeline green

---

## 6. Output Format

Structure your response as:

1. **Reproduction Confirmation** (what you found)
2. **Root Cause Analysis** (detailed investigation)
3. **Fix Plan** (what you'll change and why)
4. **Code Changes** (using Edit tool)
5. **Test Suite** (regression + edge cases)
6. **Prevention Measures** (monitoring, process)
7. **Verification Checklist** (with confirmations)
8. **Post-Mortem Notes** (lessons learned, optional)

---

**Remember**: A good bug fix not only solves the problem, but prevents it from happening again. 🔧
