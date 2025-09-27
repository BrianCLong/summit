package custody

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"time"
)

// Window describes the timeframe a hold must cover.
type Window struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// Event captures an action recorded for a hold.
type Event struct {
	Sequence         int       `json:"sequence"`
	Timestamp        time.Time `json:"timestamp"`
	HoldID           string    `json:"holdId"`
	System           string    `json:"system"`
	Action           string    `json:"action"`
	ScopeFingerprint string    `json:"scopeFingerprint"`
	PrevHash         string    `json:"prevHash"`
	Hash             string    `json:"hash"`
}

// Ledger maintains an append-only log of custody events.
type Ledger struct {
	events []Event
}

// Record appends an event to the ledger and returns the resulting event.
func (l *Ledger) Record(holdID, system, action string, fingerprintParts []string, ts time.Time) Event {
	sort.Strings(fingerprintParts)
	fingerprint := fmt.Sprintf("%s|%s|%s", holdID, system, joinParts(fingerprintParts))

	prevHash := ""
	seq := len(l.events) + 1
	if seq > 1 {
		prevHash = l.events[len(l.events)-1].Hash
	}

	hash := computeHash(prevHash, holdID, system, action, fingerprint, ts)
	event := Event{
		Sequence:         seq,
		Timestamp:        ts.UTC(),
		HoldID:           holdID,
		System:           system,
		Action:           action,
		ScopeFingerprint: fingerprint,
		PrevHash:         prevHash,
		Hash:             hash,
	}

	l.events = append(l.events, event)
	return event
}

// Events returns all ledger events.
func (l *Ledger) Events() []Event {
	clone := make([]Event, len(l.events))
	copy(clone, l.events)
	return clone
}

// ProofForHold returns the events related to a particular hold identifier.
func (l *Ledger) ProofForHold(holdID string) []Event {
	var proof []Event
	for _, event := range l.events {
		if event.HoldID == holdID {
			proof = append(proof, event)
		}
	}
	return proof
}

// VerifyProof validates the event chain for a hold and ensures every
// verification event matches its corresponding apply fingerprint.
func VerifyProof(events []Event) error {
	if len(events) == 0 {
		return fmt.Errorf("no custody events supplied")
	}

	var prevHash string
	applyFingerprints := make(map[string]string)
	verifiedSystems := make(map[string]struct{})

	for _, event := range events {
		expectedHash := computeHash(prevHash, event.HoldID, event.System, event.Action, event.ScopeFingerprint, event.Timestamp)
		if event.Hash != expectedHash {
			return fmt.Errorf("custody hash mismatch at sequence %d", event.Sequence)
		}

		if event.Action == "apply" {
			applyFingerprints[event.System] = event.ScopeFingerprint
		}

		if event.Action == "verify" {
			fingerprint, ok := applyFingerprints[event.System]
			if !ok {
				return fmt.Errorf("verify event encountered before apply for system %s", event.System)
			}
			if fingerprint != event.ScopeFingerprint {
				return fmt.Errorf("verification fingerprint changed for system %s", event.System)
			}
			verifiedSystems[event.System] = struct{}{}
		}

		prevHash = event.Hash
	}

	if len(verifiedSystems) == 0 {
		return fmt.Errorf("no verification events present")
	}

	return nil
}

func computeHash(prevHash, holdID, system, action, fingerprint string, ts time.Time) string {
	digest := fmt.Sprintf("%s|%s|%s|%s|%d|%s", prevHash, holdID, system, action, ts.UnixNano(), fingerprint)
	sum := sha256.Sum256([]byte(digest))
	return hex.EncodeToString(sum[:])
}

func joinParts(parts []string) string {
	return fmt.Sprintf("[%s]", join(parts, ","))
}

func join(parts []string, sep string) string {
	switch len(parts) {
	case 0:
		return ""
	case 1:
		return parts[0]
	}

	size := len(sep) * (len(parts) - 1)
	for _, part := range parts {
		size += len(part)
	}

	buf := make([]byte, 0, size)
	for idx, part := range parts {
		buf = append(buf, part...)
		if idx < len(parts)-1 {
			buf = append(buf, sep...)
		}
	}

	return string(buf)
}
