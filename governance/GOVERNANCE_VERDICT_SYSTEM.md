# Governance Verdict System

**Document Version:** 1.0.0
**Last Updated:** 2025-12-27
**Owner:** Security & Compliance Team
**SOC 2 Controls:** CC6.1, CC7.2, PI1.3

## Overview

The Governance Verdict System ensures that **every** AI/agent output includes a mandatory governance evaluation verdict. This system makes bypassing governance **structurally impossible** through type system enforcement, runtime validation, and comprehensive testing.

## Purpose

### Business Objectives

- Ensure all autonomous AI/agent actions comply with organizational policies
- Provide audit trail for compliance and security reviews
- Enable real-time governance decision-making
- Support SOC 2 Type 2 compliance requirements

### Technical Objectives

- Make governance evaluation mandatory at the type system level
- Prevent bypass through structural enforcement
- Provide detailed audit evidence for all AI/agent outputs
- Enable automated compliance monitoring

## Architecture

### Components

#### 1. GovernanceVerdict Type

Located in:

- `/home/user/summit/services/agent-execution-platform/src/types/index.ts`
- `/home/user/summit/server/src/ai/copilot/types.ts`

```typescript
export interface GovernanceVerdict {
  verdict: "APPROVED" | "REJECTED" | "REQUIRES_REVIEW";
  policy: string;
  rationale: string;
  timestamp: string; // ISO 8601
  evaluatedBy: string;
  confidence: number; // 0.0 to 1.0
  metadata?: {
    policyVersion?: string;
    evidence?: string[];
    riskLevel?: "low" | "medium" | "high" | "critical";
    soc2Controls?: string[];
    remediationSuggestions?: string[];
    [key: string]: any;
  };
}
```

#### 2. Governance Services

**Agent Execution Platform:**

- Location: `/home/user/summit/services/agent-execution-platform/src/governance/index.ts`
- Responsibility: Generate verdicts for agent executions
- Default Policy: `agent-execution-policy`

**AI Copilot:**

- Location: `/home/user/summit/server/src/ai/copilot/governance.service.ts`
- Responsibility: Generate verdicts for copilot responses
- Default Policy: `copilot-answer-policy`

#### 3. Integration Points

All AI/agent execution paths are wired to emit verdicts:

1. **Agent Execution Platform**
   - `AgentResult` type requires `governanceVerdict` field
   - `AgentRunner.execute()` generates verdict for every execution
   - Safety validation failures include governance verdict

2. **AI Copilot Service**
   - `CopilotAnswer` requires `governanceVerdict` field
   - `CopilotRefusal` requires `governanceVerdict` field
   - All response paths generate appropriate verdict

## Verdict Types

### APPROVED

- **Meaning:** The AI/agent output passed all governance policies
- **Action:** Output may proceed to user/system
- **Confidence:** Typically 0.8-1.0
- **Risk Level:** Typically low or medium

### REJECTED

- **Meaning:** The AI/agent output violated critical policies
- **Action:** Output MUST be blocked
- **Confidence:** Typically 1.0 (high certainty in rejection)
- **Risk Level:** Typically high or critical

### REQUIRES_REVIEW

- **Meaning:** The output requires manual review before proceeding
- **Action:** Queue for human review
- **Confidence:** Typically 0.6-0.9 (some uncertainty)
- **Risk Level:** Typically medium or high

## Policy Evaluation

### Default Policies

1. **agent-execution-policy**
   - Evaluates agent executions
   - Checks resource usage, safety violations, rate limits
   - Applied by: Agent Execution Platform

2. **copilot-answer-policy**
   - Evaluates copilot answers
   - Checks citations, provenance, guardrails, redaction
   - Applied by: AI Copilot Service

3. **copilot-refusal-policy**
   - Evaluates refusal decisions
   - Maps refusal categories to risk levels
   - Applied by: AI Copilot Service

4. **prompt-guardrails-policy**
   - Evaluates user prompts
   - Checks for malicious content, PII, injection attempts
   - Applied by: AI Copilot Service

5. **safety-validation**
   - Evaluates safety check results
   - Converts safety violations to governance verdicts
   - Applied by: Agent Execution Platform

### Custom Policy Registration

Services can register custom policy evaluators:

```typescript
import { getGovernanceService } from "./governance";

const governanceService = getGovernanceService();

governanceService.registerPolicy("custom-policy", async (input, context) => {
  // Evaluate policy
  const violations = [];

  if (input.containsSensitiveData) {
    violations.push({
      rule: "no-sensitive-data",
      severity: "critical",
      message: "Sensitive data detected",
    });
  }

  return {
    passed: violations.length === 0,
    violations,
  };
});
```

## Bypass Prevention

### Type System Enforcement

The verdict system uses TypeScript's type system to make bypass impossible:

```typescript
// This will NOT compile - missing governanceVerdict
const result: AgentResult = {
  success: true,
  data: {},
  metrics: { ... },
  // ERROR: Property 'governanceVerdict' is missing
};
```

### Runtime Validation

Zod schemas enforce verdict presence at runtime:

```typescript
export const CopilotAnswerSchema = z.object({
  // ... other fields
  governanceVerdict: GovernanceVerdictSchema, // REQUIRED
});
```

### Error Handling

Even in error cases, a verdict MUST be returned:

```typescript
try {
  // Execution logic
} catch (error) {
  // MUST return verdict even on error
  return {
    success: false,
    error: agentError,
    governanceVerdict: await generateVerdictForError(error),
  };
}
```

### Emergency Failsafe

If verdict generation fails, an emergency rejection is returned:

```typescript
const emergencyVerdict = governanceService.generateEmergencyRejection("Verdict generation failed");
// Always returns REJECTED verdict with critical risk level
```

## Testing

### Test Coverage

Comprehensive bypass prevention tests are located at:

1. **Agent Execution Platform:**
   - `/home/user/summit/services/agent-execution-platform/tests/unit/governance.test.ts`
   - 15+ test cases covering bypass attempts

2. **AI Copilot:**
   - `/home/user/summit/server/src/ai/copilot/__tests__/governance.bypass.test.ts`
   - 20+ test cases covering verdict generation and validation

### Test Scenarios

- ✅ Type system enforcement
- ✅ Verdict always returned (no exceptions)
- ✅ Error handling includes verdicts
- ✅ Null/undefined input handling
- ✅ Partial response handling
- ✅ Timeout scenarios
- ✅ Emergency rejection fallback
- ✅ Multi-policy evaluation
- ✅ SOC 2 control mapping

### Running Tests

```bash
# Agent execution platform tests
cd services/agent-execution-platform
npm test -- governance.test.ts

# Copilot governance tests
cd server
npm test -- governance.bypass.test.ts
```

## SOC 2 Compliance

### Control Mapping

Every verdict includes SOC 2 control mappings:

- **CC6.1 (Logical Access Controls)**
  - Ensures all AI outputs are evaluated against access policies
  - Prevents unauthorized or non-compliant outputs

- **CC7.2 (System Change Management)**
  - Tracks all AI/agent decisions with audit trail
  - Enables change review and approval workflows

- **PI1.3 (Processing Integrity)**
  - Ensures accurate processing through policy evaluation
  - Validates output quality and compliance

### Audit Trail

Every verdict includes:

- Unique execution/answer ID
- Timestamp (ISO 8601)
- Evaluated by (system identifier)
- Policy name and version
- Full rationale and evidence

Audit logs are automatically generated and can be queried for compliance reporting.

## Monitoring and Alerting

### Metrics to Monitor

1. **Verdict Distribution**
   - Track ratio of APPROVED / REJECTED / REQUIRES_REVIEW
   - Alert on unusual rejection spikes

2. **Confidence Levels**
   - Track average verdict confidence
   - Alert on low confidence trends

3. **Policy Violations**
   - Track most common policy violations
   - Alert on critical violations

4. **Emergency Rejections**
   - Count emergency failsafe activations
   - Alert immediately on any emergency rejection

### Dashboard Queries

```sql
-- Verdict distribution last 24h
SELECT verdict, COUNT(*)
FROM governance_verdicts
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY verdict;

-- Policy violations by type
SELECT policy, metadata->>'riskLevel', COUNT(*)
FROM governance_verdicts
WHERE verdict = 'REJECTED'
GROUP BY policy, metadata->>'riskLevel';

-- Low confidence verdicts
SELECT *
FROM governance_verdicts
WHERE confidence < 0.8
ORDER BY timestamp DESC;
```

## Best Practices

### For Developers

1. **Never skip verdict generation**
   - All execution paths MUST generate verdicts
   - Use emergency rejection if normal generation fails

2. **Include rich context**
   - Populate metadata with relevant evidence
   - Provide actionable remediation suggestions

3. **Test bypass scenarios**
   - Add tests for edge cases
   - Verify type system enforcement

4. **Log verdict decisions**
   - Include verdict in all execution logs
   - Tag logs with audit IDs

### For Operators

1. **Monitor verdict metrics**
   - Set up dashboards for verdict distribution
   - Alert on anomalies

2. **Review REQUIRES_REVIEW cases**
   - Establish SLA for manual review
   - Feed outcomes back into policy refinement

3. **Audit policy effectiveness**
   - Regular review of policy violation patterns
   - Adjust policies based on false positive/negative rates

4. **Test incident response**
   - Practice emergency rejection scenarios
   - Verify alert escalation paths

## Troubleshooting

### Issue: Missing Verdict in Response

**Symptom:** Response does not include governanceVerdict field

**Diagnosis:**

1. Check TypeScript compilation errors
2. Verify Zod schema validation
3. Review service initialization logs

**Resolution:**

1. Ensure governance service is initialized
2. Verify all response builders include verdict generation
3. Check for catch blocks that bypass verdict

### Issue: All Verdicts are APPROVED

**Symptom:** No rejections despite policy violations

**Diagnosis:**

1. Check if policy evaluators are registered
2. Verify policy evaluation logic
3. Review test coverage

**Resolution:**

1. Register policies with governance service
2. Add logging to policy evaluation
3. Write tests for rejection scenarios

### Issue: Emergency Rejections

**Symptom:** Seeing emergency-failsafe verdicts

**Diagnosis:**

1. Review error logs for verdict generation failures
2. Check policy evaluator exceptions
3. Verify service health

**Resolution:**

1. Fix underlying errors in policy evaluation
2. Add error handling in policy evaluators
3. Monitor service dependencies (DB, APIs)

## Migration Guide

### Adding Verdicts to Existing Code

1. **Update Types**

   ```typescript
   import { GovernanceVerdict } from "./types";

   interface MyResponse {
     // existing fields...
     governanceVerdict: GovernanceVerdict; // ADD THIS
   }
   ```

2. **Initialize Governance Service**

   ```typescript
   import { getGovernanceService } from "./governance";

   const governanceService = getGovernanceService();
   ```

3. **Generate Verdicts**

   ```typescript
   const verdict = await governanceService.generateVerdict(input, context, "my-policy");

   return {
     // existing fields...
     governanceVerdict: verdict,
   };
   ```

4. **Add Tests**
   ```typescript
   it("should include governance verdict", async () => {
     const result = await myFunction();
     expect(result.governanceVerdict).toBeDefined();
     expect(result.governanceVerdict.verdict).toMatch(/^(APPROVED|REJECTED|REQUIRES_REVIEW)$/);
   });
   ```

## References

- [OPA Policy Documentation](../policies/)
- [IGAC Sign-off](./IGAC_SIGN_OFF_OCT2025.md)
- [Agent Governance](./AGENT_GOVERNANCE.md)
- [SOC 2 Framework](https://www.aicpa.org/soc-for-cybersecurity)

## Version History

| Version | Date       | Author                  | Changes               |
| ------- | ---------- | ----------------------- | --------------------- |
| 1.0.0   | 2025-12-27 | GA Hardening Initiative | Initial documentation |

## Approval

This document is approved for implementation as part of GA-E1: Governance hardening.

**Approver:** Security & Compliance Team
**Date:** 2025-12-27
**Status:** APPROVED
