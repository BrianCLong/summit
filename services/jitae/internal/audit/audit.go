package audit

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Event represents an append-only audit record with cryptographic linking.
type Event struct {
	ID            string         `json:"id"`
	Type          string         `json:"type"`
	Timestamp     time.Time      `json:"timestamp"`
	Payload       map[string]any `json:"payload,omitempty"`
	PayloadDigest string         `json:"payloadDigest"`
	PrevHash      string         `json:"prevHash"`
	EventHash     string         `json:"eventHash"`
	Signature     string         `json:"signature"`
}

// ExportBundle is a transport-safe package for audit events.
type ExportBundle struct {
	Manifest     Manifest           `json:"manifest"`
	Schema       map[string]any     `json:"schema"`
	Records      []ExportEvent      `json:"records"`
	Verification VerificationReport `json:"verification"`
}

// Manifest summarizes the exported window.
type Manifest struct {
	From        int       `json:"from"`
	To          int       `json:"to"`
	Total       int       `json:"total"`
	GeneratedAt time.Time `json:"generatedAt"`
}

// ExportEvent redacts payloads while preserving integrity material.
type ExportEvent struct {
	ID            string    `json:"id"`
	Type          string    `json:"type"`
	Timestamp     time.Time `json:"timestamp"`
	PayloadDigest string    `json:"payloadDigest"`
	PrevHash      string    `json:"prevHash"`
	EventHash     string    `json:"eventHash"`
	Signature     string    `json:"signature"`
}

// VerificationReport details chain integrity checks.
type VerificationReport struct {
	CheckedEvents int      `json:"checkedEvents"`
	ChainOK       bool     `json:"chainOk"`
	SignatureOK   bool     `json:"signatureOk"`
	Failures      []string `json:"failures"`
}

// Manager produces and validates append-only audit events.
type Manager struct {
	mu     sync.RWMutex
	events []Event

	priv ed25519.PrivateKey
	pub  ed25519.PublicKey
}

// NewManagerFromSecret derives a deterministic keypair from a shared secret.
func NewManagerFromSecret(secret string) (*Manager, error) {
	if secret == "" {
		return nil, errors.New("secret is required")
	}
	seed := sha256.Sum256([]byte(secret))
	priv := ed25519.NewKeyFromSeed(seed[:])
	pub := priv.Public().(ed25519.PublicKey)

	return &Manager{priv: priv, pub: pub}, nil
}

// Record appends a new event to the log.
func (m *Manager) Record(ctx context.Context, eventType string, payload map[string]any, ts time.Time) (Event, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	clonedPayload := deepCopyPayload(payload)
	payloadDigest, err := hashPayload(clonedPayload)
	if err != nil {
		return Event{}, err
	}

	prevHash := ""
	if len(m.events) > 0 {
		prevHash = m.events[len(m.events)-1].EventHash
	}

	eventHash := computeEventHash(eventType, ts, prevHash, payloadDigest)
	sig := ed25519.Sign(m.priv, []byte(eventHash))

	evt := Event{
		ID:            uuid.NewString(),
		Type:          eventType,
		Timestamp:     ts,
		Payload:       clonedPayload,
		PayloadDigest: payloadDigest,
		PrevHash:      prevHash,
		EventHash:     eventHash,
		Signature:     hex.EncodeToString(sig),
	}

	m.events = append(m.events, evt)
	return cloneEvent(evt), nil
}

// Events returns a defensive copy of the audit log.
func (m *Manager) Events() []Event {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]Event, len(m.events))
	for i, evt := range m.events {
		out[i] = cloneEvent(evt)
	}
	return out
}

// Verify validates a single event against the manager's public key and hashes.
func (m *Manager) Verify(evt Event) bool {
	return verifyWithKey(m.pub, evt)
}

// VerifyChain ensures the provided events form a valid, untampered chain.
func (m *Manager) VerifyChain(events []Event) (VerificationReport, bool) {
	report := VerificationReport{CheckedEvents: len(events), ChainOK: true, SignatureOK: true}
	for i, evt := range events {
		if !verifyWithKey(m.pub, evt) {
			report.SignatureOK = false
			report.Failures = append(report.Failures, "signature mismatch for "+evt.ID)
		}
		expectedPrev := ""
		if i > 0 {
			expectedPrev = events[i-1].EventHash
		}
		if evt.PrevHash != expectedPrev {
			report.ChainOK = false
			report.Failures = append(report.Failures, "prevHash mismatch for "+evt.ID)
		}
		payloadDigest, err := hashPayload(evt.Payload)
		if err != nil {
			report.Failures = append(report.Failures, "payload error for "+evt.ID)
			report.ChainOK = false
		}
		expectedHash := computeEventHash(evt.Type, evt.Timestamp, evt.PrevHash, payloadDigest)
		if payloadDigest != evt.PayloadDigest || expectedHash != evt.EventHash {
			report.ChainOK = false
			report.SignatureOK = false
			report.Failures = append(report.Failures, "hash mismatch for "+evt.ID)
		}
	}
	ok := report.ChainOK && report.SignatureOK && len(report.Failures) == 0
	return report, ok
}

// PublicKeyHex exposes the public verification key.
func (m *Manager) PublicKeyHex() string {
	return hex.EncodeToString(m.pub)
}

// Export returns a paginated, PII-safe bundle of audit events.
func (m *Manager) Export(from, to int) (ExportBundle, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	total := len(m.events)
	report, _ := m.VerifyChain(m.events)

	if total == 0 {
		return ExportBundle{
			Manifest:     Manifest{From: 0, To: -1, Total: 0, GeneratedAt: time.Now().UTC()},
			Schema:       exportSchema(),
			Records:      nil,
			Verification: report,
		}, nil
	}
	if from < 0 {
		from = 0
	}
	if to <= 0 || to >= total {
		to = total - 1
	}
	if from > to && total > 0 {
		from = to
	}
	window := make([]Event, 0)
	if total > 0 && from <= to {
		window = m.events[from : to+1]
	}

	records := make([]ExportEvent, 0, len(window))
	for _, evt := range window {
		records = append(records, ExportEvent{
			ID:            evt.ID,
			Type:          evt.Type,
			Timestamp:     evt.Timestamp,
			PayloadDigest: evt.PayloadDigest,
			PrevHash:      evt.PrevHash,
			EventHash:     evt.EventHash,
			Signature:     evt.Signature,
		})
	}

	return ExportBundle{
		Manifest:     Manifest{From: from, To: to, Total: total, GeneratedAt: time.Now().UTC()},
		Schema:       exportSchema(),
		Records:      records,
		Verification: report,
	}, nil
}

func exportSchema() map[string]any {
	return map[string]any{
		"id":            "string",
		"type":          "string",
		"timestamp":     "RFC3339Nano",
		"payloadDigest": "sha256",
		"prevHash":      "sha256",
		"eventHash":     "sha256",
		"signature":     "ed25519 hex",
	}
}

// VerifyWithPublicKey validates an event given a hex encoded public key.
func VerifyWithPublicKey(pubKey string, evt Event) (bool, error) {
	decoded, err := hex.DecodeString(pubKey)
	if err != nil {
		return false, err
	}
	return verifyWithKey(ed25519.PublicKey(decoded), evt), nil
}

func verifyWithKey(pub ed25519.PublicKey, evt Event) bool {
	payloadDigest, err := hashPayload(evt.Payload)
	if err != nil || payloadDigest != evt.PayloadDigest {
		return false
	}
	expected := computeEventHash(evt.Type, evt.Timestamp, evt.PrevHash, payloadDigest)
	if expected != evt.EventHash {
		return false
	}
	sig, err := hex.DecodeString(evt.Signature)
	if err != nil {
		return false
	}
	return ed25519.Verify(pub, []byte(evt.EventHash), sig)
}

func computeEventHash(eventType string, ts time.Time, prevHash, payloadDigest string) string {
	canonical := map[string]string{
		"type":          eventType,
		"timestamp":     ts.UTC().Format(time.RFC3339Nano),
		"prevHash":      prevHash,
		"payloadDigest": payloadDigest,
	}
	data, _ := json.Marshal(canonical)
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func hashPayload(payload map[string]any) (string, error) {
	normalized, err := normalizeValue(payload)
	if err != nil {
		return "", err
	}
	data, err := json.Marshal(normalized)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:]), nil
}

func normalizeValue(v any) (any, error) {
	switch t := v.(type) {
	case nil:
		return nil, nil
	case map[string]any:
		keys := make([]string, 0, len(t))
		for k := range t {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		pairs := make([]map[string]any, 0, len(keys))
		for _, k := range keys {
			normalizedVal, err := normalizeValue(t[k])
			if err != nil {
				return nil, err
			}
			pairs = append(pairs, map[string]any{"key": k, "value": normalizedVal})
		}
		return pairs, nil
	case []any:
		out := make([]any, 0, len(t))
		for _, item := range t {
			normalizedVal, err := normalizeValue(item)
			if err != nil {
				return nil, err
			}
			out = append(out, normalizedVal)
		}
		return out, nil
	case time.Time:
		return t.UTC().Format(time.RFC3339Nano), nil
	default:
		return t, nil
	}
}

func deepCopyPayload(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = deepCopyValue(v)
	}
	return out
}

func deepCopyValue(v any) any {
	switch t := v.(type) {
	case map[string]any:
		return deepCopyPayload(t)
	case []any:
		out := make([]any, len(t))
		for i, item := range t {
			out[i] = deepCopyValue(item)
		}
		return out
	default:
		return t
	}
}

func cloneEvent(evt Event) Event {
	return Event{
		ID:            evt.ID,
		Type:          evt.Type,
		Timestamp:     evt.Timestamp,
		Payload:       deepCopyPayload(evt.Payload),
		PayloadDigest: evt.PayloadDigest,
		PrevHash:      evt.PrevHash,
		EventHash:     evt.EventHash,
		Signature:     evt.Signature,
	}
}
