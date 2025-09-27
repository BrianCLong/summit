package gossip

import (
	"encoding/base64"
	"testing"
	"time"

	merklelog "github.com/summit/transparency/idtl/internal/log"
)

func TestDetectEquivocation(t *testing.T) {
	logA := merklelog.New()
	logB := merklelog.New()

	// Append identical first entry
	entry := &merklelog.Entry{ID: "1", Timestamp: time.Now(), Decision: "approve"}
	if _, _, err := logA.Append(entry); err != nil {
		t.Fatalf("append A: %v", err)
	}
	entryB := &merklelog.Entry{ID: "1", Timestamp: entry.Timestamp, Decision: "approve"}
	if _, _, err := logB.Append(entryB); err != nil {
		t.Fatalf("append B: %v", err)
	}

	// Diverge
	if _, _, err := logA.Append(&merklelog.Entry{ID: "2", Timestamp: time.Now(), Decision: "alpha"}); err != nil {
		t.Fatalf("append A diverge: %v", err)
	}
	if _, _, err := logB.Append(&merklelog.Entry{ID: "2", Timestamp: time.Now(), Decision: "beta"}); err != nil {
		t.Fatalf("append B diverge: %v", err)
	}

	stA, _ := logA.LatestSTH()
	stB, _ := logB.LatestSTH()
	stB.RootHash = mutateRoot(stB.RootHash)

	err := DetectEquivocation([]Observation{{Source: "A", Head: stA}, {Source: "B", Head: stB}})
	if err == nil {
		t.Fatalf("expected equivocation to be detected")
	}
}

func mutateRoot(root string) string {
	raw, _ := base64.StdEncoding.DecodeString(root)
	raw[0] ^= 0xFF
	return base64.StdEncoding.EncodeToString(raw)
}
