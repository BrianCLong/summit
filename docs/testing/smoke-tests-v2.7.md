# IntelGraph v2.7 Smoke Test Suite

## Overview

Comprehensive smoke test validation for v2.7 features including advanced search, graph visualization, real-time notifications, data export, and investigation management.

**Estimated Time:** 10 minutes  
**Prerequisites:** Test environment with sample data loaded  
**Test Account:** `test-analyst@intelgraph.com` with full permissions

## Test Environment Setup

### Data Requirements

- 100+ entities (persons, organizations, IPs, emails)
- 50+ relationships across entity types
- 5+ pre-created investigations with different statuses
- Export templates: Executive, Technical, Forensic
- Test notification triggers configured

### Browser Configuration

- Chrome 120+ with Developer Tools enabled
- Network throttling: "Fast 3G" for performance validation
- Clear cache and cookies before starting
- Performance monitoring tab open

## Test Execution

### 1. Advanced Search Validation ✅ (2 minutes)

**Test Case:** Multi-criteria search with DSL and visual filters

**Steps:**

1. Navigate to Home → Search Tab
2. Enter query: `type:person confidence:>80 created:last-7d`
3. Verify visual filter chips appear automatically
4. Click "Entity Types" filter → select "Organization"
5. Adjust confidence slider to 85-100 range
6. Set date range to last 30 days
7. Execute search and measure response time

**Expected Results:**

- [ ] Query DSL syntax highlighting works
- [ ] Visual filter chips display correctly
- [ ] Results appear in <100ms
- [ ] Entity cards show metadata (type, confidence, dates)
- [ ] Filter state persists on page refresh
- [ ] No JavaScript errors in console

**Performance Validation:**

- Search response time: \_\_\_ms (target: <100ms)
- Results rendering time: \_\_\_ms (target: <50ms)
- Memory usage after search: \_\_\_MB (target: <150MB)

---

### 2. Graph Visualization Testing ✅ (2 minutes)

**Test Case:** Interactive graph with physics simulation and controls

**Steps:**

1. From search results, click "View in Graph" or navigate to Overview → Graph Preview
2. Verify initial layout renders with sample data
3. Toggle layout: Force-directed → Circular → Clustered
4. Hover over node → verify tooltip appears with entity details
5. Click node → verify highlighting and selection state
6. Use mouse wheel to zoom in and out
7. Monitor FPS counter in corner (if visible)

**Expected Results:**

- [ ] Graph renders within 2 seconds
- [ ] Layout transitions are smooth (no jerky animations)
- [ ] Tooltips show accurate entity data
- [ ] Node highlighting persists until another node is selected
- [ ] Zoom controls work smoothly
- [ ] Color coding matches entity types in legend
- [ ] Performance remains stable with 50+ nodes

**Performance Validation:**

- Initial render time: \_\_\_ms (target: <2000ms)
- Frame rate during interaction: \_\_\_fps (target: >55fps)
- Layout transition smoothness: Pass/Fail
- Memory impact: \_\_\_MB increase (target: <50MB)

---

### 3. Real-time Notifications Check ✅ (2 minutes)

**Test Case:** Live notification system with toast alerts and center

**Steps:**

1. Verify notification bell icon in top navigation
2. Trigger test notification via admin panel or API:
   ```bash
   curl -X POST https://api-test.intelgraph.com/admin/trigger-notification \
   -H "Authorization: Bearer $TEST_TOKEN" \
   -d '{"type": "action_safety", "severity": "warning", "message": "Test notification for smoke test"}'
   ```
3. Observe toast notification appears (top-right)
4. Wait 2 seconds, verify toast auto-dismisses (if configured)
5. Click notification bell → verify center panel opens
6. Check notification appears in history with timestamp
7. Test audio alert (if enabled): trigger critical notification

**Expected Results:**

- [ ] Toast notification appears within 2 seconds of trigger
- [ ] Toast contains correct icon, title, and message
- [ ] Auto-dismiss works if configured (5 second default)
- [ ] Notification bell shows badge with count
- [ ] Notification center opens on click
- [ ] History shows complete notification with metadata
- [ ] Audio plays once for critical alerts (if enabled)
- [ ] Manual dismiss button works

**Performance Validation:**

- Notification delivery latency: \_\_\_ms (target: <2000ms)
- WebSocket connection status: Connected/Disconnected
- No console errors related to subscriptions

---

### 4. Export Functionality Test ✅ (2 minutes)

**Test Case:** Multi-format export with templates and progress tracking

**Steps:**

1. Navigate to Home → Export Tab
2. Select export format: CSV
3. Choose template: "Forensic Report"
4. Enable checkboxes: "Include Metadata" and "Include Relationships"
5. Set investigation ID: Use test investigation from setup
6. Click "Export Data" button
7. Monitor progress indicator/spinner
8. When complete, click download link
9. Verify file downloads and opens correctly
10. Check export appears in "Recent Exports" history section

**Expected Results:**

- [ ] All export format options are selectable
- [ ] Template selection updates available options
- [ ] Export job starts immediately on click
- [ ] Progress indicator shows activity
- [ ] Download link appears when job completes
- [ ] File downloads successfully (check Downloads folder)
- [ ] Export history shows entry with metadata
- [ ] Re-download from history works
- [ ] File contains expected data structure

**Performance Validation:**

- Export job start delay: \_\_\_ms (target: <500ms)
- Small dataset export time: \_\_\_s (target: <30s)
- File size matches expectations: \_\_\_KB
- Download speed acceptable for file size

---

### 5. Investigation Management ✅ (1.5 minutes)

**Test Case:** Full CRUD operations with status workflow

**Steps:**

1. Navigate to Home → Investigations Tab
2. Click "New Investigation" button
3. Fill form:
   - Name: "ACME-Fraud-Test-[TIMESTAMP]"
   - Description: "Smoke test investigation for v2.7 validation"
   - Priority: "High"
   - Status: "Active" (if available)
   - Tags: "smoke-test, validation, v2.7"
4. Click "Create" and verify investigation appears in list
5. Toggle between Grid and List view modes
6. Click "Edit" on the created investigation
7. Change priority to "Critical"
8. Save changes and verify updates appear
9. Note investigation ID for potential cleanup

**Expected Results:**

- [ ] New investigation form opens correctly
- [ ] All form fields accept input properly
- [ ] Investigation creates successfully
- [ ] Appears in investigation list immediately
- [ ] Grid/List view toggle works smoothly
- [ ] Edit form pre-populates with existing data
- [ ] Updates save and display correctly
- [ ] Status indicators show proper colors (High=orange, Critical=red)
- [ ] Tags display as chips/badges

**Data Validation:**

- Investigation ID: **\*\***\_\_\_**\*\***
- All fields saved correctly: Pass/Fail
- Status color coding accurate: Pass/Fail

---

### 6. Action Details & Error Handling ✅ (0.5 minutes)

**Test Case:** Action page rendering and error boundary functionality

**Steps:**

1. Navigate directly to: `/actions/test-action-123`
2. Verify action details page loads completely
3. Check safety status banner displays (if applicable)
4. Click browser back button → verify breadcrumb navigation
5. Navigate to invalid route: `/actions/nonexistent-action-id`
6. Verify error boundary shows fallback UI instead of blank page
7. Click "Return Home" button from error page

**Expected Results:**

- [ ] Action details page renders without errors
- [ ] Safety status banner prominently displayed
- [ ] All page elements load (no missing components)
- [ ] Navigation breadcrumb shows current location
- [ ] Error boundary catches invalid routes
- [ ] Fallback UI is user-friendly (not technical stack trace)
- [ ] "Return Home" navigation works correctly
- [ ] No JavaScript errors in console during error scenarios

**Error Boundary Validation:**

- Error message user-friendly: Pass/Fail
- Stack trace hidden from user: Pass/Fail
- Navigation still functional: Pass/Fail

## Performance Summary

### Overall Metrics (Target vs Actual)

- Initial page load: \_\_\_s (target: <3s)
- Total memory usage after all tests: \_\_\_MB (target: <200MB)
- JavaScript errors encountered: \_\_\_ (target: 0)
- Network requests (excluding test data): \_\_\_ (target: <50)

### Feature Performance

- Search response time: \_\_\_ms (target: <100ms)
- Graph rendering FPS: \_\_\_fps (target: >55fps)
- Export job initiation: \_\_\_ms (target: <500ms)
- Notification delivery: \_\_\_ms (target: <2000ms)

### Browser Console Check

Review browser console for any errors:

- [ ] No JavaScript errors
- [ ] No network request failures (4xx/5xx)
- [ ] No React warnings about keys, props, etc.
- [ ] No deprecation warnings

## Mobile Responsiveness (Optional - 1 minute)

**Test Case:** Basic mobile layout validation

**Steps:**

1. Open Chrome DevTools
2. Toggle device emulation → iPhone 12 (390px width)
3. Navigate through main tabs (Overview, Investigations, Search, Export)
4. Verify layouts adapt appropriately
5. Test touch interactions on key buttons

**Expected Results:**

- [ ] Navigation collapses appropriately
- [ ] Tab navigation remains functional
- [ ] Form inputs are properly sized
- [ ] No horizontal scrolling required
- [ ] Touch targets are appropriately sized (44px+)

## Accessibility Quick Check (Optional - 1 minute)

**Test Case:** Basic accessibility validation

**Steps:**

1. Open Chrome DevTools → Lighthouse tab
2. Run accessibility audit on home page
3. Check for critical violations
4. Test keyboard navigation (Tab key through interface)
5. Verify focus indicators are visible

**Expected Results:**

- [ ] Lighthouse accessibility score >90
- [ ] No critical violations
- [ ] Keyboard navigation reaches all interactive elements
- [ ] Focus indicators visible and clear
- [ ] Screen reader labels present (check HTML structure)

## Test Results Summary

### Pass Criteria

✅ All 6 core test scenarios must pass  
✅ No critical JavaScript errors  
✅ Performance metrics meet targets  
✅ Mobile layout functional (if tested)  
✅ Basic accessibility standards met

### Failure Escalation

- **1-2 failures:** Document and continue with deployment
- **3+ failures:** Hold deployment, notify engineering team
- **Performance failures:** Review with SRE team before proceeding
- **Security/Error boundary failures:** Immediate escalation

### Test Environment Cleanup

- [ ] Delete test investigation: `ACME-Fraud-Test-[TIMESTAMP]`
- [ ] Clear test notifications from history
- [ ] Remove test export files from downloads
- [ ] Reset browser cache if needed

---

**Test Completed By:** **\*\***\_\_\_**\*\***  
**Date/Time:** **\*\***\_\_\_**\*\***  
**Environment:** **\*\***\_\_\_**\*\***  
**Overall Result:** PASS / FAIL

**Notes:**
_Record any unexpected behavior, workarounds used, or areas needing follow-up_
