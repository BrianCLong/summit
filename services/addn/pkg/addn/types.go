package addn

import "time"

// ManifestArtifact describes an individual artifact that belongs to a dataset version.
type ManifestArtifact struct {
	Name       string   `json:"name"`
	Digest     string   `json:"digest"`
	Size       int      `json:"size"`
	PolicyTags []string `json:"policyTags"`
	Residency  string   `json:"residency"`
	EdgeURL    string   `json:"edgeUrl"`
}

// ProofStep is a single signature in the proof chain from origin to edge.
type ProofStep struct {
	Authority string `json:"authority"`
	PublicKey string `json:"publicKey"`
	Signature string `json:"signature"`
}

// ProofChain is an ordered set of signatures that attests the manifest.
type ProofChain struct {
	Steps []ProofStep `json:"steps"`
}

// Manifest encapsulates the deterministic dataset metadata that clients verify.
type Manifest struct {
	Dataset                     string             `json:"dataset"`
	Version                     string             `json:"version"`
	IssuedAt                    time.Time          `json:"issuedAt"`
	ValidUntil                  time.Time          `json:"validUntil"`
	StaleWhileRevalidateSeconds int64              `json:"staleWhileRevalidateSeconds"`
	PolicyTags                  []string           `json:"policyTags"`
	ResidencyPins               []string           `json:"residencyPins"`
	Artifacts                   []ManifestArtifact `json:"artifacts"`
	ManifestDigest              string             `json:"manifestDigest"`
	ProofChain                  ProofChain         `json:"proofChain"`
}

// ManifestResponse is emitted by the edge service and consumed by clients.
type ManifestResponse struct {
	Manifest    Manifest       `json:"manifest"`
	Status      string         `json:"status"`
	Revocations RevocationList `json:"revocations"`
}

// Revocation captures a revoked manifest or artifact digest.
type Revocation struct {
	Reason    string    `json:"reason"`
	RevokedAt time.Time `json:"revokedAt"`
}

// RevocationList contains the active revocations from origin and edge.
type RevocationList struct {
	Version   int                   `json:"version"`
	UpdatedAt time.Time             `json:"updatedAt"`
	Manifests map[string]Revocation `json:"manifests"`
	Artifacts map[string]Revocation `json:"artifacts"`
}

// ArtifactEnvelope is returned when fetching artifact content from the edge.
type ArtifactEnvelope struct {
	Name      string `json:"name"`
	Digest    string `json:"digest"`
	Content   []byte `json:"content"`
	Residency string `json:"residency"`
}
