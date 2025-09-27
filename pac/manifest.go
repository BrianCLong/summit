package pac

import (
	"encoding/json"
	"time"
)

// Manifest captures the metadata associated with a cache entry and its signature.
type Manifest struct {
	Key           string            `json:"key"`
	ResourceID    string            `json:"resourceId"`
	Tenant        string            `json:"tenant"`
	SubjectClass  string            `json:"subjectClass"`
	PolicyHash    string            `json:"policyHash"`
	Locale        string            `json:"locale"`
	Jurisdiction  string            `json:"jurisdiction"`
	CreatedAt     time.Time         `json:"createdAt"`
	ExpiresAt     time.Time         `json:"expiresAt"`
	TTLSeconds    int64             `json:"ttlSeconds"`
	ValueChecksum string            `json:"valueChecksum"`
	ManifestExtra map[string]string `json:"manifestExtra,omitempty"`
	Signature     string            `json:"signature"`
}

// ManifestSigner signs and verifies manifest payloads.
type ManifestSigner interface {
	Sign(payload []byte) (string, error)
	Verify(payload []byte, signature string) bool
}

type manifestPayload struct {
	Key           string            `json:"key"`
	ResourceID    string            `json:"resourceId"`
	Tenant        string            `json:"tenant"`
	SubjectClass  string            `json:"subjectClass"`
	PolicyHash    string            `json:"policyHash"`
	Locale        string            `json:"locale"`
	Jurisdiction  string            `json:"jurisdiction"`
	CreatedAt     time.Time         `json:"createdAt"`
	ExpiresAt     time.Time         `json:"expiresAt"`
	TTLSeconds    int64             `json:"ttlSeconds"`
	ValueChecksum string            `json:"valueChecksum"`
	ManifestExtra map[string]string `json:"manifestExtra,omitempty"`
}

// ManifestFromPayload constructs a manifest from an unsigned payload and signature.
func ManifestFromPayload(payload manifestPayload, signature string) Manifest {
	return Manifest{
		Key:           payload.Key,
		ResourceID:    payload.ResourceID,
		Tenant:        payload.Tenant,
		SubjectClass:  payload.SubjectClass,
		PolicyHash:    payload.PolicyHash,
		Locale:        payload.Locale,
		Jurisdiction:  payload.Jurisdiction,
		CreatedAt:     payload.CreatedAt,
		ExpiresAt:     payload.ExpiresAt,
		TTLSeconds:    payload.TTLSeconds,
		ValueChecksum: payload.ValueChecksum,
		ManifestExtra: payload.ManifestExtra,
		Signature:     signature,
	}
}

// Payload marshals the manifest (without the signature) into a canonical payload.
func (m Manifest) Payload() (manifestPayload, []byte, error) {
	payload := manifestPayload{
		Key:           m.Key,
		ResourceID:    m.ResourceID,
		Tenant:        m.Tenant,
		SubjectClass:  m.SubjectClass,
		PolicyHash:    m.PolicyHash,
		Locale:        m.Locale,
		Jurisdiction:  m.Jurisdiction,
		CreatedAt:     m.CreatedAt,
		ExpiresAt:     m.ExpiresAt,
		TTLSeconds:    m.TTLSeconds,
		ValueChecksum: m.ValueChecksum,
		ManifestExtra: m.ManifestExtra,
	}
	bytes, err := json.Marshal(payload)
	return payload, bytes, err
}

// Verify ensures the manifest signature matches the payload when verified by the signer.
func (m Manifest) Verify(signer ManifestSigner) bool {
	if signer == nil {
		return false
	}
	_, payloadBytes, err := m.Payload()
	if err != nil {
		return false
	}
	return signer.Verify(payloadBytes, m.Signature)
}
