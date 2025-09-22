# P0 - Critical Issues (Crashes/Blocks Functionality)

## Template
```
**Issue ID**: P0-001
**Component**: [UI/API/Backend/Integration]
**Runbook**: [R1-R6]
**Description**: Brief description of the issue
**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Result**: What should happen
**Actual Result**: What actually happens
**Environment**: [Local/Preview/Staging]
**Browser/Client**: [Chrome/Firefox/Safari/Mobile]
**Assignee**: TBD
**Status**: [Open/In Progress/Fixed/Deferred]
```

## Issues Found
<!-- Add P0 issues below -->

**Issue ID**: P0-001
**Component**: Infrastructure/Development Environment
**Runbook**: [R1-R6] - All runbooks affected
**Description**: Node.js version conflict (v22 vs v20 requirement) prevents all application startup
**Steps to Reproduce**:
1. Attempt to run any npm/pnpm script
2. Start web server or development environment
3. Execute Playwright tests

**Expected Result**: Applications start normally with Node.js v20.11.x
**Actual Result**: Error: Cannot find module 'walk-up-path/dist/cjs/index.js', engine validation failures
**Environment**: Local
**Browser/Client**: N/A - System level
**Assignee**: DevOps/Infrastructure Team
**Status**: Open - Requires immediate Node.js version alignment

**Issue ID**: P0-002
**Component**: UI Testing Infrastructure
**Runbook**: [R3, R4, R5] - Visual components
**Description**: Playwright web server fails to start preventing any UI testing
**Steps to Reproduce**:
1. Run `./scripts/bug-bash-coordinator.sh ui-tests`
2. Execute `npx playwright test`

**Expected Result**: Web server starts and UI tests execute across browsers
**Actual Result**: WebServer exit code 7, MODULE_NOT_FOUND errors, no UI validation possible
**Environment**: Local
**Browser/Client**: All browsers affected
**Assignee**: QA/Testing Team
**Status**: Open - Blocked by P0-001

