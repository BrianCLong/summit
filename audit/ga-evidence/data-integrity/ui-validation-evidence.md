# UI Validation Evidence - Data Integrity

**Epic:** GA-E2: Data Integrity
**Component:** Client-Side Validation
**Date:** 2025-12-27

## Overview

This document provides evidence of client-side validation that rejects unlabeled or tampered data, ensuring data integrity at the presentation layer.

## Client-Side Validator Implementation

**Location:** `/home/user/summit/client/src/utils/data-envelope-validator.ts`

### Validation Function

```typescript
export function validateDataEnvelope<T>(
  envelope: any,
  config: ValidationConfig = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!envelope.provenance) {
    errors.push("Missing provenance metadata - unlabeled data rejected");
  }

  if (envelope.isSimulated === undefined) {
    errors.push("Missing isSimulated flag - data integrity cannot be verified");
  }

  if (!envelope.dataHash) {
    errors.push("Missing data hash - integrity cannot be verified");
  }

  // ... additional validation

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

### Validation Rules

| Rule                         | Severity | Action                           |
| ---------------------------- | -------- | -------------------------------- |
| Missing provenance           | ERROR    | Reject data                      |
| Missing isSimulated flag     | ERROR    | Reject data                      |
| Missing dataHash             | ERROR    | Reject data                      |
| Missing classification       | ERROR    | Reject data                      |
| Low confidence (<0.7)        | WARNING  | Log warning, allow with notice   |
| Simulated data in production | ERROR    | Reject data                      |
| Hash mismatch                | ERROR    | Reject data (tampering detected) |

### Default Configuration

```typescript
const DEFAULT_CONFIG: ValidationConfig = {
  minConfidence: 0.7,
  rejectSimulated: process.env.NODE_ENV === "production",
  verifyHash: true,
  strictMode: false,
};
```

## UI Components

**Location:** `/home/user/summit/client/src/components/DataIntegrityIndicators.tsx`

### 1. Confidence Indicator

Visual progress bar showing AI confidence level:

```typescript
<ConfidenceIndicator confidence={0.85} size="medium" showLabel={true} />
```

**Features:**

- Color-coded by confidence level
  - Green (≥0.8): High confidence
  - Amber (0.5-0.8): Medium confidence
  - Red (<0.5): Low confidence
- Percentage display
- Accessible (ARIA attributes)

### 2. Simulation Badge

Warning badge for simulated data:

```typescript
<SimulationBadge isSimulated={true} size="medium" />
```

**Features:**

- Yellow warning color
- Warning icon
- "SIMULATED DATA" label
- Only shown when `isSimulated === true`

### 3. Classification Badge

Security classification indicator:

```typescript
<ClassificationBadge classification="CONFIDENTIAL" size="medium" />
```

**Features:**

- Color-coded by classification level
  - Green: PUBLIC
  - Blue: INTERNAL
  - Amber: CONFIDENTIAL
  - Red: RESTRICTED
  - Dark Red: HIGHLY_RESTRICTED
- Text label with classification

### 4. Provenance Display

Expandable provenance metadata display:

```typescript
<ProvenanceDisplay envelope={envelope} expandable={true} />
```

**Features:**

- Formatted provenance summary
- Expandable lineage chain
- Provenance ID display
- Data hash display
- Actor and timestamp information

### 5. Complete Data Envelope Card

Full card with all integrity indicators:

```typescript
<DataEnvelopeCard envelope={envelope} showProvenance={true}>
  {/* Your content here */}
</DataEnvelopeCard>
```

**Features:**

- Header with classification and simulation badges
- Confidence indicator for AI content
- Warning banner if warnings present
- Content area
- Provenance footer
- Error boundary for validation failures

## HTTP Interceptor

**Integration with axios/fetch:**

```typescript
import { createEnvelopeInterceptor } from "./data-envelope-validator";

const interceptor = createEnvelopeInterceptor({
  minConfidence: 0.7,
  rejectSimulated: true,
  strictMode: false,
});

// Axios integration
axios.interceptors.response.use(interceptor.axiosResponseInterceptor, (error) =>
  Promise.reject(error)
);

// Fetch integration
const response = await fetch("/api/endpoint");
const data = await interceptor.fetchResponseInterceptor(response);
```

**Behavior:**

- Validates every API response
- Throws `DataEnvelopeValidationError` on failure
- Logs warnings to console
- Unwraps envelope and returns data
- Preserves provenance metadata

## Error Handling

### DataEnvelopeValidationError

Custom error class for validation failures:

```typescript
class DataEnvelopeValidationError extends Error {
  public errors: string[];
  public warnings: string[];

  constructor(validation: ValidationResult) {
    super(`Data envelope validation failed: ${validation.errors.join(", ")}`);
    this.errors = validation.errors;
    this.warnings = validation.warnings;
  }
}
```

### Error Boundary Component

React error boundary for graceful failure:

```typescript
<DataEnvelopeErrorBoundary>
  <YourComponent />
</DataEnvelopeErrorBoundary>
```

**Features:**

- Catches validation errors
- Displays user-friendly error message
- Shows error details in development
- Prevents partial/corrupted data display

## Validation Examples

### ✅ Valid Response (Passes Validation)

```json
{
  "data": { "result": "value" },
  "provenance": {
    "source": "api-service-v1.0.0",
    "generatedAt": "2025-12-27T10:00:00Z",
    "lineage": [],
    "provenanceId": "prov-123"
  },
  "isSimulated": false,
  "classification": "INTERNAL",
  "dataHash": "abc123...",
  "warnings": []
}
```

**Result:** ✅ Validation passes, data displayed

---

### ❌ Missing Provenance (Fails Validation)

```json
{
  "data": { "result": "value" }
}
```

**Result:** ❌ Validation fails
**Error:** "Missing provenance metadata - unlabeled data rejected"
**Action:** Data rejected, error shown to user

---

### ❌ Simulated Data in Production (Fails Validation)

```json
{
  "data": { "result": "value" },
  "provenance": { ... },
  "isSimulated": true,
  "classification": "INTERNAL",
  "dataHash": "abc123...",
  "warnings": []
}
```

**Result:** ❌ Validation fails (in production)
**Error:** "Simulated data not allowed in production environment"
**Action:** Data rejected, error shown to user

---

### ⚠️ Low Confidence (Passes with Warning)

```json
{
  "data": { "hypothesis": "..." },
  "provenance": { ... },
  "confidence": 0.62,
  "isSimulated": false,
  "classification": "CONFIDENTIAL",
  "dataHash": "abc123...",
  "warnings": ["Low confidence hypothesis - manual review recommended"]
}
```

**Result:** ⚠️ Validation passes with warning
**Warning:** "Low AI confidence score: 0.62"
**Action:** Data displayed with warning indicator

---

### ❌ Hash Mismatch (Fails Validation)

```json
{
  "data": { "result": "tampered value" },
  "provenance": { ... },
  "isSimulated": false,
  "classification": "INTERNAL",
  "dataHash": "original-hash-not-matching",
  "warnings": []
}
```

**Result:** ❌ Validation fails
**Error:** "Data hash integrity check failed - possible tampering detected"
**Action:** Data rejected, security alert logged

## User Experience Flow

### 1. API Request

```typescript
const response = await fetch("/api/ai/hypothesis");
const data = await response.json();
```

### 2. Automatic Validation

```typescript
// Interceptor validates envelope
const validation = validateDataEnvelope(data);

if (!validation.valid) {
  throw new DataEnvelopeValidationError(validation);
}
```

### 3. Visual Indicators

```tsx
<DataEnvelopeCard envelope={data}>
  {/* Classification badge: CONFIDENTIAL */}
  {/* Confidence indicator: 85% */}
  {/* No simulation badge (not simulated) */}

  <HypothesisContent data={data.data} />

  {/* Provenance footer with lineage */}
</DataEnvelopeCard>
```

### 4. User Sees

- **Header:** Classification badge (Confidential - amber)
- **Confidence Bar:** 85% (green)
- **Content:** Hypothesis data
- **Provenance:** "Generated by ai-hypothesis-generator-v1.2.0 at 10:30 AM"
- **No warnings** (high confidence)

## Testing Evidence

### Unit Tests

**Test File:** `__tests__/data-envelope-validator.test.ts`

```typescript
describe("validateDataEnvelope", () => {
  it("rejects data without provenance", () => {
    const result = validateDataEnvelope({ data: "test" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing provenance metadata - unlabeled data rejected");
  });

  it("accepts valid envelope", () => {
    const envelope = createValidEnvelope();
    const result = validateDataEnvelope(envelope);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("warns on low confidence", () => {
    const envelope = createEnvelopeWithConfidence(0.62);
    const result = validateDataEnvelope(envelope);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain("Low AI confidence score: 0.62");
  });
});
```

### Integration Tests

**Test File:** `__tests__/data-envelope-integration.test.tsx`

```typescript
describe('DataEnvelopeCard', () => {
  it('displays confidence indicator for AI content', () => {
    const envelope = createAIEnvelope(0.85);
    render(<DataEnvelopeCard envelope={envelope} />);

    expect(screen.getByTestId('confidence-indicator')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows simulation badge when simulated', () => {
    const envelope = createSimulatedEnvelope();
    render(<DataEnvelopeCard envelope={envelope} />);

    expect(screen.getByTestId('simulation-badge')).toBeInTheDocument();
    expect(screen.getByText('SIMULATED DATA')).toBeInTheDocument();
  });
});
```

## Security Considerations

### 1. Client-Side Validation is First Line of Defense

- Provides immediate feedback
- Prevents UI from rendering invalid data
- Reduces server load from invalid requests

### 2. Server-Side Validation is Required

- Client validation can be bypassed
- Server must enforce same rules
- Defense in depth approach

### 3. Hash Verification

- Detects tampering in transit
- Verifies data integrity
- Alerts on hash mismatch

### 4. Production Safeguards

- Simulated data automatically rejected in production
- Environment-aware validation rules
- Confidence thresholds enforced

## Compliance Mapping

| Control   | Evidence                                               |
| --------- | ------------------------------------------------------ |
| **PI1.1** | Provenance validation rejects unlabeled data           |
| **PI1.2** | Timestamp validation ensures timeliness                |
| **PI1.4** | Hash verification ensures validity                     |
| **C1.2**  | Classification badges enforce confidentiality controls |

## Monitoring & Alerting

### Client-Side Metrics

- Validation failure rate
- Common validation errors
- Hash mismatch incidents (potential security events)
- Low confidence data frequency

### Logging

All validation failures logged to console with:

- Validation errors
- Validation warnings
- Envelope metadata (provenance ID, source)
- Timestamp

### Security Alerts

Hash mismatch triggers:

- Client-side error log
- Server-side security alert
- Potential incident investigation

## Accessibility

All UI components include:

- ARIA labels for screen readers
- Semantic HTML
- Keyboard navigation support
- Color contrast compliance (WCAG AA)
- Text alternatives for visual indicators

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ JavaScript features
- No IE11 support required
- Progressive enhancement approach

## Evidence Summary

✅ **Client-side validation implemented**
✅ **Unlabeled data rejected**
✅ **Visual integrity indicators**
✅ **Simulation mode detection**
✅ **Confidence threshold enforcement**
✅ **Hash verification**
✅ **Error boundaries for graceful failures**
✅ **Comprehensive unit and integration tests**

**Status:** IMPLEMENTED AND TESTED ✅
**Ready for Audit:** YES ✅
