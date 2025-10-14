package orchestrator

import "fmt"

// evaluatePolicies validates records against configured policies and returns violations.
func evaluatePolicies(req NormalizedRequest, records []Record) []PolicyViolation {
	violations := make([]PolicyViolation, 0)
	for _, record := range records {
		if req.Policies.RequireConsent && !record.ConsentGranted {
			violations = append(violations, PolicyViolation{
				Policy:   "consent",
				RecordID: record.ID,
				Reason:   "consent not granted",
			})
		}
		if len(req.Policies.AllowedJurisdictions) > 0 {
			if _, ok := req.Policies.AllowedJurisdictions[record.Jurisdiction]; !ok {
				violations = append(violations, PolicyViolation{
					Policy:   "jurisdiction",
					RecordID: record.ID,
					Reason:   fmt.Sprintf("jurisdiction %s not allowed", record.Jurisdiction),
				})
			}
		}
		if !record.RetentionExpiresAt.After(req.Policies.RetentionCutoff) {
			violations = append(violations, PolicyViolation{
				Policy:   "retention",
				RecordID: record.ID,
				Reason:   fmt.Sprintf("retention expired at %s", record.RetentionExpiresAt.Format("2006-01-02T15:04:05Z07:00")),
			})
		}
	}
	return violations
}
