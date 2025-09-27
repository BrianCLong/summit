package model

import "testing"

func TestCloneCanarySpec(t *testing.T) {
	spec := CanarySpec{
		Scope:      "scope.alpha",
		TTLSeconds: 120,
		Payload: map[string]any{
			"account": "A-1",
		},
		Metadata: map[string]any{
			"owner": "blue-team",
		},
		Stores: []StoreKind{StoreObject, StoreDatabase},
	}

	clone := CloneCanarySpec(spec)

	if &clone == &spec {
		t.Fatalf("expected clone to be a new struct")
	}
	if len(clone.Stores) != len(spec.Stores) {
		t.Fatalf("expected stores length %d, got %d", len(spec.Stores), len(clone.Stores))
	}

	spec.Payload["account"] = "tampered"
	spec.Metadata["owner"] = "red-team"
	spec.Stores[0] = StoreVector

	if clone.Payload["account"] != "A-1" {
		t.Fatalf("expected payload to remain unchanged, got %v", clone.Payload["account"])
	}
	if clone.Metadata["owner"] != "blue-team" {
		t.Fatalf("expected metadata to remain unchanged, got %v", clone.Metadata["owner"])
	}
	if clone.Stores[0] != StoreObject {
		t.Fatalf("expected clone stores to remain independent")
	}
}
