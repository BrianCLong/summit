package model

import (
	"maps"
	"slices"
	"time"
)

// StoreKind represents the supported storage backends for canary placement.
type StoreKind string

const (
	StoreDatabase StoreKind = "database"
	StoreObject   StoreKind = "object"
	StoreSearch   StoreKind = "search"
	StoreVector   StoreKind = "vector"
)

// CanarySpec describes the canary to be planted across federated stores.
type CanarySpec struct {
	Scope      string         `json:"scope"`
	TTLSeconds int64          `json:"ttlSeconds"`
	Payload    map[string]any `json:"payload"`
	Stores     []StoreKind    `json:"stores"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

// CanaryRecord is the canonical representation of a canary with provenance.
type CanaryRecord struct {
	ID         string     `json:"id"`
	Spec       CanarySpec `json:"spec"`
	SeededAt   time.Time  `json:"seededAt"`
	ExpiresAt  time.Time  `json:"expiresAt"`
	Provenance Provenance `json:"provenance"`
}

// StoredCanary represents an instance of a canary in a specific store.
type StoredCanary struct {
	Store  StoreKind    `json:"store"`
	Record CanaryRecord `json:"record"`
}

// Provenance captures the signed metadata for a canary seed event.
type Provenance struct {
	CanaryID           string    `json:"canaryId"`
	Scope              string    `json:"scope"`
	TTLSeconds         int64     `json:"ttlSeconds"`
	SeededAt           time.Time `json:"seededAt"`
	ExpiresAt          time.Time `json:"expiresAt"`
	RetrievalSignature string    `json:"retrievalSignature"`
	Signature          string    `json:"signature"`
}

// Detection represents a verified observation of a canary in a store.
type Detection struct {
	CanaryID   string     `json:"canaryId"`
	Scope      string     `json:"scope"`
	Store      StoreKind  `json:"store"`
	Observed   time.Time  `json:"observed"`
	Confidence float64    `json:"confidence"`
	Provenance Provenance `json:"provenance"`
}

// AttributionFinding groups detections that belong to the same canary.
type AttributionFinding struct {
	CanaryID   string      `json:"canaryId"`
	Scope      string      `json:"scope"`
	Stores     []StoreKind `json:"stores"`
	Confidence float64     `json:"confidence"`
	Provenance Provenance  `json:"provenance"`
}

// AttributionReport summarises all findings for investigator review.
type AttributionReport struct {
	GeneratedAt time.Time            `json:"generatedAt"`
	Findings    []AttributionFinding `json:"findings"`
}

// CloneCanarySpec returns a defensive copy of the provided canary spec so that
// subsequent mutations by callers do not alter stored provenance records.
func CloneCanarySpec(spec CanarySpec) CanarySpec {
	clone := CanarySpec{
		Scope:      spec.Scope,
		TTLSeconds: spec.TTLSeconds,
		Stores:     slices.Clone(spec.Stores),
	}
	if spec.Payload != nil {
		clone.Payload = maps.Clone(spec.Payload)
	}
	if spec.Metadata != nil {
		clone.Metadata = maps.Clone(spec.Metadata)
	}
	return clone
}
