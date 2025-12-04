package addn

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"time"
)

var (
	// ErrManifestExpired indicates that the manifest is outside its SMaxAge+SWR window.
	ErrManifestExpired = errors.New("manifest expired beyond stale-while-revalidate window")
	// ErrManifestRevoked indicates the manifest digest was revoked.
	ErrManifestRevoked = errors.New("manifest digest has been revoked")
	// ErrArtifactRevoked indicates the artifact digest was revoked.
	ErrArtifactRevoked = errors.New("artifact digest has been revoked")
	// ErrResidencyViolation indicates a residency pin mismatch.
	ErrResidencyViolation = errors.New("residency requirement violated")
	// ErrProofInvalid indicates a signature failure.
	ErrProofInvalid = errors.New("proof chain verification failed")
)

type manifestCanonical struct {
	Dataset                     string             `json:"dataset"`
	Version                     string             `json:"version"`
	IssuedAt                    time.Time          `json:"issuedAt"`
	ValidUntil                  time.Time          `json:"validUntil"`
	StaleWhileRevalidateSeconds int64              `json:"staleWhileRevalidateSeconds"`
	PolicyTags                  []string           `json:"policyTags"`
	ResidencyPins               []string           `json:"residencyPins"`
	Artifacts                   []ManifestArtifact `json:"artifacts"`
}

// ComputeManifestDigest calculates the canonical SHA-256 digest used for signing manifests.
func ComputeManifestDigest(m Manifest) (string, error) {
	canonical := manifestCanonical{
		Dataset:                     m.Dataset,
		Version:                     m.Version,
		IssuedAt:                    m.IssuedAt.UTC(),
		ValidUntil:                  m.ValidUntil.UTC(),
		StaleWhileRevalidateSeconds: m.StaleWhileRevalidateSeconds,
		PolicyTags:                  append([]string(nil), m.PolicyTags...),
		ResidencyPins:               append([]string(nil), m.ResidencyPins...),
		Artifacts:                   append([]ManifestArtifact(nil), m.Artifacts...),
	}

	sort.Strings(canonical.PolicyTags)
	sort.Strings(canonical.ResidencyPins)
	sort.Slice(canonical.Artifacts, func(i, j int) bool {
		return canonical.Artifacts[i].Name < canonical.Artifacts[j].Name
	})
	for i := range canonical.Artifacts {
		artifact := &canonical.Artifacts[i]
		sort.Strings(artifact.PolicyTags)
	}

	payload, err := json.Marshal(canonical)
	if err != nil {
		return "", err
	}

	digest := sha256.Sum256(payload)
	return hex.EncodeToString(digest[:]), nil
}

// VerifyManifest performs expiration, revocation, residency, and proof checks.
func VerifyManifest(resp ManifestResponse, now time.Time, region string) error {
	manifest := resp.Manifest
	digest, err := ComputeManifestDigest(manifest)
	if err != nil {
		return err
	}
	if digest != manifest.ManifestDigest {
		return ErrProofInvalid
	}

	if now.After(manifest.ValidUntil.Add(time.Duration(manifest.StaleWhileRevalidateSeconds) * time.Second)) {
		return ErrManifestExpired
	}

	if resp.Revocations.Manifests != nil {
		if _, ok := resp.Revocations.Manifests[manifest.ManifestDigest]; ok {
			return ErrManifestRevoked
		}
	}

	if err := verifyProofChain(manifest.ProofChain, digest); err != nil {
		return err
	}

	if region != "" {
		if err := VerifyResidency(manifest, region); err != nil {
			return err
		}
	}

	if resp.Revocations.Artifacts != nil {
		for _, art := range manifest.Artifacts {
			if _, revoked := resp.Revocations.Artifacts[art.Digest]; revoked {
				return ErrArtifactRevoked
			}
		}
	}

	return nil
}

// VerifyResidency ensures the manifest allows serving the requested region.
func VerifyResidency(manifest Manifest, region string) error {
	allowed := false
	for _, pin := range manifest.ResidencyPins {
		if pin == region {
			allowed = true
			break
		}
	}
	if !allowed {
		return ErrResidencyViolation
	}

	for _, art := range manifest.Artifacts {
		if art.Residency != "" && art.Residency != region {
			return ErrResidencyViolation
		}
	}
	return nil
}

func verifyProofChain(chain ProofChain, digest string) error {
	if len(chain.Steps) < 2 {
		return ErrProofInvalid
	}

	expected := []byte(digest)
	var prevSig []byte
	for _, step := range chain.Steps {
		sig, err := base64.StdEncoding.DecodeString(step.Signature)
		if err != nil {
			return err
		}
		pub, err := base64.StdEncoding.DecodeString(step.PublicKey)
		if err != nil {
			return err
		}
		if len(pub) != ed25519.PublicKeySize {
			return ErrProofInvalid
		}
		if !ed25519.Verify(ed25519.PublicKey(pub), expected, sig) {
			return ErrProofInvalid
		}
		prevSig = sig
		expected = append([]byte(digest), prevSig...)
	}
	return nil
}
