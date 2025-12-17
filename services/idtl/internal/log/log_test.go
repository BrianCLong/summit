package log

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"testing"
	"time"
)

func TestAppendAndInclusionProof(t *testing.T) {
	ml := New()
	entry := &Entry{ID: "1", Timestamp: time.Now(), Decision: "approve", Metadata: map[string]string{"model": "alpha"}}
	index, sth, err := ml.Append(entry)
	if err != nil {
		t.Fatalf("append failed: %v", err)
	}
	if index != 0 {
		t.Fatalf("expected index 0, got %d", index)
	}
	if sth.TreeSize != 1 {
		t.Fatalf("expected tree size 1, got %d", sth.TreeSize)
	}
	proof, err := ml.InclusionProof(0)
	if err != nil {
		t.Fatalf("proof error: %v", err)
	}
	if len(proof) != 0 {
		t.Fatalf("expected empty proof for single leaf, got %d", len(proof))
	}
}

func TestConsistencyProof(t *testing.T) {
	ml := New()
	entries := []string{"decision-1", "decision-2", "decision-3", "decision-4"}
	var sth SignedTreeHead
	for i, decision := range entries {
		e := &Entry{ID: string(rune('a' + i)), Timestamp: time.Now(), Decision: decision}
		if _, sthNew, err := ml.Append(e); err != nil {
			t.Fatalf("append: %v", err)
		} else {
			sth = sthNew
		}
	}
	proof, err := ml.ConsistencyProof(2, 4)
	if err != nil {
		t.Fatalf("consistency proof error: %v", err)
	}
	if len(proof) == 0 {
		t.Fatalf("expected non-empty proof")
	}
	history := ml.AllSTHs()
	old := history[1]
	oldHashes, err := ml.LeafHashes(2)
	if err != nil {
		t.Fatalf("leaf hashes: %v", err)
	}
	newHashes, err := ml.LeafHashes(4)
	if err != nil {
		t.Fatalf("new leaf hashes: %v", err)
	}
	for i := range oldHashes {
		if !bytes.Equal(oldHashes[i], newHashes[i]) {
			t.Fatalf("hash prefix mismatch at %d", i)
		}
	}
	oldRootCalc := computeRootFromHashes(oldHashes)
	newRootCalc := computeRootFromHashes(newHashes)
	oldRoot, _ := base64.StdEncoding.DecodeString(old.RootHash)
	newRoot, _ := base64.StdEncoding.DecodeString(sth.RootHash)
	if !bytes.Equal(oldRootCalc, oldRoot) || !bytes.Equal(newRootCalc, newRoot) {
		t.Fatalf("recomputed roots do not match recorded roots")
	}
}

func TestRedactedEntry(t *testing.T) {
	ml := New()
	disclosure := "sensitive"
	hashed := hashDisclosure(disclosure)
	entry := &Entry{
		ID:             "r1",
		Timestamp:      time.Now(),
		Redacted:       true,
		DisclosureHash: hashed,
		Metadata:       map[string]string{"type": "redacted"},
	}
	if _, _, err := ml.Append(entry); err != nil {
		t.Fatalf("append: %v", err)
	}
	stored, _, err := ml.EntryByID("r1")
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if stored.Decision != "" {
		t.Fatalf("expected no decision text, got %q", stored.Decision)
	}
	if stored.DisclosureHash != hashed {
		t.Fatalf("hash mismatch")
	}
}

func hashDisclosure(value string) string {
	sum := sha256.Sum256([]byte(value))
	return base64.StdEncoding.EncodeToString(sum[:])
}

func computeRootFromHashes(hashes [][]byte) []byte {
	nodes := make([][]byte, len(hashes))
	for i := range hashes {
		nodes[i] = append([]byte(nil), hashes[i]...)
	}
	for len(nodes) > 1 {
		var next [][]byte
		for i := 0; i < len(nodes); i += 2 {
			if i+1 < len(nodes) {
				next = append(next, nodeHash(nodes[i], nodes[i+1]))
			} else {
				next = append(next, nodes[i])
			}
		}
		nodes = next
	}
	if len(nodes) == 0 {
		return nil
	}
	return nodes[0]
}
