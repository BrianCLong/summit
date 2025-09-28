package policy

import (
	"testing"

	"github.com/summit/psb/internal/model"
)

func TestFilter(t *testing.T) {
	records := []model.Record{
		{ID: "a", Geo: "US", ConsentedPartners: []string{"p1"}, ConsentTags: []string{"analytics"}},
		{ID: "b", Geo: "CA", ConsentedPartners: []string{"p1", "p2"}, ConsentTags: []string{"analytics", "ads"}},
		{ID: "c", Geo: "US", ConsentedPartners: []string{"p2"}, ConsentTags: []string{"ads"}},
	}

	exclusions := map[string]struct{}{"b": {}}
	already := map[string]struct{}{}

	filtered := Filter(records, "p1", []string{"US", "CA"}, []string{"analytics"}, exclusions, already)
	if len(filtered) != 1 || filtered[0].ID != "a" {
		t.Fatalf("unexpected filtered result: %#v", filtered)
	}
}

func TestHasAll(t *testing.T) {
	if !HasAll([]string{"a", "b", "c"}, []string{"a", "c"}) {
		t.Fatal("expected set to contain all required values")
	}
	if HasAll([]string{"a", "b"}, []string{"a", "c"}) {
		t.Fatal("expected missing value to be detected")
	}
}

func TestHasConsent(t *testing.T) {
	record := model.Record{ConsentedPartners: []string{"p1", "p2"}}
	if !HasConsent(record, "p1") {
		t.Fatal("expected partner consent")
	}
	if HasConsent(record, "p3") {
		t.Fatal("expected partner without consent to be rejected")
	}
}
