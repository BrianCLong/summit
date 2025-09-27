package service

import (
	"math"
	"testing"

	"github.com/summit/gcm/internal/signature"
)

func TestRecordJobCalculatesCharges(t *testing.T) {
	cfg := DefaultConfig()
	store := NewMemoryStore()
	ledger := NewBudgetLedger()
	svc := NewService(cfg, store, ledger, signature.NewSigner("test"), 0.02)

	resp, violation, err := svc.RecordJob(JobRequest{
		JobID:      "job-123",
		AccountID:  "acct-1",
		PolicyTier: "pii.medium",
		Residency:  "us",
		Usage: WorkloadUsage{
			CPUHours:  1.0,
			StorageGB: 2.0,
			EgressGB:  3.0,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if violation != nil {
		t.Fatalf("expected job to be accepted, got violation: %+v", violation)
	}
	expectedTotal := 1.0*0.37 + 2.0*0.09 + 3.0*0.11
	if math.Abs(resp.Charges.Total-expectedTotal) > 1e-9 {
		t.Fatalf("expected total %.2f, got %.2f", expectedTotal, resp.Charges.Total)
	}

	manifest, err := svc.GenerateManifest("acct-1")
	if err != nil {
		t.Fatalf("manifest error: %v", err)
	}
	if len(manifest.LineItems) != 1 {
		t.Fatalf("expected 1 line item, got %d", len(manifest.LineItems))
	}
	if math.Abs(manifest.LineItems[0].Charges.Total-expectedTotal) > 1e-9 {
		t.Fatalf("manifest total mismatch: %.2f", manifest.LineItems[0].Charges.Total)
	}
	if manifest.Signature == "" {
		t.Fatalf("expected signature")
	}
}

func TestRecordJobBudgetViolation(t *testing.T) {
	cfg := DefaultConfig()
	// Overwrite budget to a small amount to trigger guardrail.
	for i := range cfg.Policies {
		if cfg.Policies[i].PolicyTier == "pii.medium" {
			cfg.Policies[i].Budget.MonthlyLimit = 0.1
		}
	}

	svc := NewService(cfg, NewMemoryStore(), NewBudgetLedger(), signature.NewSigner("test"), 0.01)

	_, violation, err := svc.RecordJob(JobRequest{
		JobID:      "job-1",
		AccountID:  "acct-2",
		PolicyTier: "pii.medium",
		Residency:  "us",
		Usage:      WorkloadUsage{CPUHours: 1},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if violation == nil {
		t.Fatalf("expected violation but got none")
	}
	if violation.Reason != "budget_guardrail_triggered" {
		t.Fatalf("unexpected reason: %s", violation.Reason)
	}
	if violation.Violation.RequiredHeadroom <= 0 {
		t.Fatalf("expected headroom to be positive")
	}
}

func TestReconcileWithinTolerance(t *testing.T) {
	cfg := DefaultConfig()
	svc := NewService(cfg, NewMemoryStore(), NewBudgetLedger(), signature.NewSigner("test"), 0.05)

	_, violation, err := svc.RecordJob(JobRequest{
		JobID:      "job-xyz",
		AccountID:  "acct-3",
		PolicyTier: "pii.low",
		Residency:  "global",
		Usage:      WorkloadUsage{CPUHours: 10},
	})
	if err != nil || violation != nil {
		t.Fatalf("expected accepted job: err=%v violation=%v", err, violation)
	}

	manifest, err := svc.GenerateManifest("acct-3")
	if err != nil {
		t.Fatalf("manifest generation failed: %v", err)
	}

	svc.SubmitProviderUsage(ProviderUsageReport{
		AccountID:  "acct-3",
		PolicyTier: "pii.low",
		Residency:  "global",
		Usage:      WorkloadUsage{CPUHours: 10},
		TotalCost:  manifest.Total.Total * 1.02, // 2% higher but within 5% tolerance
		Currency:   manifest.Currency,
		ReportedAt: manifest.GeneratedAt,
	})

	summary, err := svc.Reconcile("acct-3")
	if err != nil {
		t.Fatalf("reconcile failed: %v", err)
	}
	if !summary.WithinTolerance {
		t.Fatalf("expected reconciliation within tolerance: %+v", summary)
	}
}
