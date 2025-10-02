package index

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"
)

// ValidateProof verifies a proof against a snapshot of the index state.
func ValidateProof(proof Proof, snapshot IndexSnapshot) error {
	if proof.Version > snapshot.Version {
		return fmt.Errorf("proof version %d is ahead of snapshot version %d", proof.Version, snapshot.Version)
	}

	switch proof.Kind {
	case ProofKindDocument:
		if proof.Document == "" {
			return errors.New("document proof missing document id")
		}
		if containsDocument(snapshot.Documents, proof.Document) {
			return fmt.Errorf("document %s still present in snapshot", proof.Document)
		}
		ts, ok := findDocumentTombstone(snapshot.DocumentTombstones, proof.Document)
		if !ok {
			return fmt.Errorf("no tombstone present for document %s", proof.Document)
		}
		expected := digestFor("document", ts.Term, ts.DocumentID, ts.Sequence, mustParseTime(ts.Timestamp), ts.Reason, ts.Version)
		if expected != ts.Digest {
			return fmt.Errorf("digest mismatch for document %s", proof.Document)
		}
	case ProofKindTerm:
		if proof.Term == "" {
			return errors.New("term proof missing term")
		}
		if proof.Document == "" {
			return errors.New("term proof missing document id")
		}
		if postingExists(snapshot.InvertedPostings, proof.Term, proof.Document) {
			return fmt.Errorf("term %s still linked to document %s", proof.Term, proof.Document)
		}
		ts, ok := findTermTombstone(snapshot.TermTombstones, proof.Term, proof.Document)
		if !ok {
			return fmt.Errorf("no term tombstone for %s/%s", proof.Term, proof.Document)
		}
		expected := digestFor("term", proof.Term, proof.Document, ts.Sequence, mustParseTime(ts.Timestamp), ts.Reason, ts.Version)
		if expected != ts.Digest {
			return fmt.Errorf("digest mismatch for term %s and document %s", proof.Term, proof.Document)
		}
	default:
		return fmt.Errorf("unsupported proof kind %s", proof.Kind)
	}

	return nil
}

func digestFor(kind, term, docID string, sequence uint64, ts time.Time, reason string, version uint64) string {
	payload := fmt.Sprintf("%s|%s|%s|%d|%d|%s|%d", kind, term, docID, sequence, ts.UnixNano(), reason, version)
	sum := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(sum[:])
}

func containsDocument(documents []DocumentView, id string) bool {
	for _, doc := range documents {
		if doc.ID == id {
			return true
		}
	}
	return false
}

func postingExists(postings []InvertedPosting, term, docID string) bool {
	for _, posting := range postings {
		if posting.Term != term {
			continue
		}
		for _, candidate := range posting.Documents {
			if candidate == docID {
				return true
			}
		}
	}
	return false
}

func findDocumentTombstone(tombstones []tombstoneView, docID string) (tombstoneView, bool) {
	for _, ts := range tombstones {
		if ts.DocumentID == docID {
			return ts, true
		}
	}
	return tombstoneView{}, false
}

func findTermTombstone(groups []TermTombstoneView, term, docID string) (tombstoneView, bool) {
	for _, group := range groups {
		if group.Term != term {
			continue
		}
		for _, ts := range group.Tombstones {
			if ts.DocumentID == docID {
				return ts, true
			}
		}
	}
	return tombstoneView{}, false
}

func mustParseTime(value string) time.Time {
	ts, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		// Fallback to zero value if parsing fails to ensure deterministic behaviour in validation errors.
		return time.Unix(0, 0).UTC()
	}
	return ts
}
