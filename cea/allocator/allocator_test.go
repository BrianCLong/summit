package allocator

import (
	"errors"
	"testing"
)

func TestAllocatorRejectsWithoutConsent(t *testing.T) {
	ledger := NewInMemoryLedger()
	alloc := NewAllocator(ledger)

	subject := Subject{
		TenantID:  "tenant-1",
		SubjectID: "user-1",
		Attributes: map[string]string{
			"region": "na",
		},
		Consents: map[string]ConsentGrant{
			"analytics": {Granted: false},
		},
	}
	alloc.UpsertSubject(subject)

	experiment := ExperimentConfig{
		ID:             "exp-1",
		TenantID:       "tenant-1",
		Purpose:        "analytics",
		Variants:       []VariantConfig{{Name: "control", Weight: 1}, {Name: "treatment", Weight: 1}},
		StickinessKeys: []string{"region"},
	}

	if _, err := alloc.Assign(experiment, "tenant-1", "user-1"); !errors.Is(err, errConsentMissing) {
		t.Fatalf("expected errConsentMissing, got %v", err)
	}

	if got := len(ledger.Entries()); got != 0 {
		t.Fatalf("expected no ledger entries, got %d", got)
	}
}

func TestDeterministicAssignments(t *testing.T) {
	ledger := NewInMemoryLedger()
	alloc := NewAllocator(ledger)

	subject := Subject{
		TenantID:  "tenant-1",
		SubjectID: "user-42",
		Attributes: map[string]string{
			"region": "emea",
		},
		Consents: map[string]ConsentGrant{
			"analytics": {Granted: true},
		},
	}
	alloc.UpsertSubject(subject)

	experiment := ExperimentConfig{
		ID:             "exp-1",
		TenantID:       "tenant-1",
		Purpose:        "analytics",
		Variants:       []VariantConfig{{Name: "control", Weight: 1}, {Name: "treatment", Weight: 1}},
		StickinessKeys: []string{"region"},
	}

	assignmentA, err := alloc.Assign(experiment, "tenant-1", "user-42")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assignmentB, err := alloc.Assign(experiment, "tenant-1", "user-42")
	if err != nil {
		t.Fatalf("unexpected error on second assign: %v", err)
	}

	if assignmentA.Variant != assignmentB.Variant {
		t.Fatalf("expected deterministic variant, got %q and %q", assignmentA.Variant, assignmentB.Variant)
	}
}

func TestRebalanceMaintainsTolerance(t *testing.T) {
	ledger := NewInMemoryLedger()
	alloc := NewAllocator(ledger)

	experiment := ExperimentConfig{
		ID:             "exp-tolerance",
		TenantID:       "tenant-1",
		Purpose:        "analytics",
		Variants:       []VariantConfig{{Name: "control", Weight: 1}, {Name: "treatment", Weight: 1}},
		StickinessKeys: []string{"segment"},
		PowerTolerance: 0.2,
	}

	subjectIDs := []string{"s1", "s2", "s3", "s4"}
	for _, id := range subjectIDs {
		alloc.UpsertSubject(Subject{
			TenantID:  "tenant-1",
			SubjectID: id,
			Attributes: map[string]string{
				"segment": "gold",
			},
			Consents: map[string]ConsentGrant{
				"analytics": {Granted: true},
			},
		})
		if _, err := alloc.Assign(experiment, "tenant-1", id); err != nil {
			t.Fatalf("initial assignment failed for %s: %v", id, err)
		}
	}

	alloc.UpsertSubject(Subject{
		TenantID:  "tenant-1",
		SubjectID: "s1",
		Attributes: map[string]string{
			"segment": "gold",
		},
		Consents: map[string]ConsentGrant{
			"analytics": {Granted: false},
		},
	})

	if _, err := alloc.Assign(experiment, "tenant-1", "s1"); !errors.Is(err, errConsentMissing) {
		t.Fatalf("expected consent error after revocation, got %v", err)
	}

	counts := map[string]int{}
	for _, id := range []string{"s2", "s3", "s4"} {
		assignment, err := alloc.Assign(experiment, "tenant-1", id)
		if err != nil {
			t.Fatalf("assignment failed for %s: %v", id, err)
		}
		counts[assignment.Variant]++
	}

	total := 0
	for _, v := range counts {
		total += v
	}
	if total != 3 {
		t.Fatalf("expected 3 consenting assignments, got %d", total)
	}

	expectedShare := 0.5
	for variant, count := range counts {
		share := float64(count) / float64(total)
		diff := share - expectedShare
		if diff < 0 {
			diff = -diff
		}
		if diff > experiment.PowerTolerance+1e-9 {
			t.Fatalf("variant %s deviates from target beyond tolerance: got %.2f", variant, share)
		}
	}

	entries := ledger.Entries()
	foundRevoked := false
	for _, entry := range entries {
		if entry.SubjectID == "s1" && entry.Event == "revoked" {
			foundRevoked = true
			break
		}
	}
	if !foundRevoked {
		t.Fatalf("expected ledger entry capturing consent revocation")
	}
}
