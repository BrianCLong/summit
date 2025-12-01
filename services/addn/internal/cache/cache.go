package cache

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"sync"
	"time"

	"github.com/summit/addn/pkg/addn"
)

// EdgeCache stores datasets and generates manifests with attestation metadata.
type EdgeCache struct {
	mu          sync.RWMutex
	datasets    map[string]*datasetRecord
	revocations addn.RevocationList
	originKey   ed25519.PrivateKey
	originPub   ed25519.PublicKey
	edgeKey     ed25519.PrivateKey
	edgePub     ed25519.PublicKey
	ttl         time.Duration
	stale       time.Duration
}

type datasetRecord struct {
	manifest  addn.Manifest
	artifacts map[string]artifactRecord
}

type artifactRecord struct {
	manifest addn.ManifestArtifact
	content  []byte
}

// ArtifactInput captures the data used to seed an artifact into the cache.
type ArtifactInput struct {
	Name       string
	Content    []byte
	PolicyTags []string
	Residency  string
}

// DatasetInput describes a dataset version upload request.
type DatasetInput struct {
	Dataset       string
	Version       string
	PolicyTags    []string
	ResidencyPins []string
	Artifacts     []ArtifactInput
}

// NewEdgeCache constructs a new in-memory edge cache instance.
func NewEdgeCache(ttl, stale time.Duration) (*EdgeCache, error) {
	originPub, originKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	edgePub, edgeKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}

	return &EdgeCache{
		datasets: make(map[string]*datasetRecord),
		revocations: addn.RevocationList{
			Version:   1,
			UpdatedAt: time.Now().UTC(),
			Manifests: make(map[string]addn.Revocation),
			Artifacts: make(map[string]addn.Revocation),
		},
		originKey: originKey,
		originPub: originPub,
		edgeKey:   edgeKey,
		edgePub:   edgePub,
		ttl:       ttl,
		stale:     stale,
	}, nil
}

func datasetKey(dataset, version string) string {
	return fmt.Sprintf("%s::%s", dataset, version)
}

// AddDataset seeds or replaces a dataset version within the cache.
func (c *EdgeCache) AddDataset(input DatasetInput, now time.Time) (addn.Manifest, error) {
	if input.Dataset == "" || input.Version == "" {
		return addn.Manifest{}, fmt.Errorf("dataset and version are required")
	}
	if len(input.Artifacts) == 0 {
		return addn.Manifest{}, fmt.Errorf("at least one artifact required")
	}

	issuedAt := now.UTC()
	validUntil := issuedAt.Add(c.ttl)

	manifestArtifacts := make([]addn.ManifestArtifact, 0, len(input.Artifacts))
	artifactRecords := make(map[string]artifactRecord, len(input.Artifacts))

	for _, art := range input.Artifacts {
		if art.Name == "" {
			return addn.Manifest{}, fmt.Errorf("artifact name required")
		}
		digest := sha256.Sum256(art.Content)
		digestHex := fmt.Sprintf("%x", digest[:])
		manifestArtifact := addn.ManifestArtifact{
			Name:       art.Name,
			Digest:     digestHex,
			Size:       len(art.Content),
			PolicyTags: append([]string(nil), art.PolicyTags...),
			Residency:  art.Residency,
			EdgeURL:    fmt.Sprintf("/datasets/%s/%s/artifact/%s", input.Dataset, input.Version, art.Name),
		}
		manifestArtifacts = append(manifestArtifacts, manifestArtifact)
		artifactRecords[art.Name] = artifactRecord{manifest: manifestArtifact, content: append([]byte(nil), art.Content...)}
	}

	manifest := addn.Manifest{
		Dataset:                     input.Dataset,
		Version:                     input.Version,
		IssuedAt:                    issuedAt,
		ValidUntil:                  validUntil,
		StaleWhileRevalidateSeconds: int64(c.stale.Seconds()),
		PolicyTags:                  append([]string(nil), input.PolicyTags...),
		ResidencyPins:               append([]string(nil), input.ResidencyPins...),
		Artifacts:                   manifestArtifacts,
	}

	digest, err := addn.ComputeManifestDigest(manifest)
	if err != nil {
		return addn.Manifest{}, err
	}
	manifest.ManifestDigest = digest

	originSig := ed25519.Sign(c.originKey, []byte(digest))
	edgeMsg := append([]byte(digest), originSig...)
	edgeSig := ed25519.Sign(c.edgeKey, edgeMsg)

	manifest.ProofChain = addn.ProofChain{Steps: []addn.ProofStep{
		{
			Authority: "origin",
			PublicKey: base64.StdEncoding.EncodeToString(c.originPub),
			Signature: base64.StdEncoding.EncodeToString(originSig),
		},
		{
			Authority: "edge",
			PublicKey: base64.StdEncoding.EncodeToString(c.edgePub),
			Signature: base64.StdEncoding.EncodeToString(edgeSig),
		},
	}}

	record := &datasetRecord{
		manifest:  manifest,
		artifacts: artifactRecords,
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	c.datasets[datasetKey(input.Dataset, input.Version)] = record

	return manifest, nil
}

// GetManifest returns the stored manifest response for a dataset version.
func (c *EdgeCache) GetManifest(dataset, version string, now time.Time) (addn.ManifestResponse, error) {
	c.mu.RLock()
	record, ok := c.datasets[datasetKey(dataset, version)]
	revocations := cloneRevocations(c.revocations)
	c.mu.RUnlock()
	if !ok {
		return addn.ManifestResponse{}, fmt.Errorf("dataset version not found")
	}

	manifest := record.manifest
	status := "fresh"
	if now.After(manifest.ValidUntil) {
		if now.After(manifest.ValidUntil.Add(c.stale)) {
			return addn.ManifestResponse{}, addn.ErrManifestExpired
		}
		status = "stale"
	}

	if _, revoked := revocations.Manifests[manifest.ManifestDigest]; revoked {
		return addn.ManifestResponse{}, addn.ErrManifestRevoked
	}

	manifestCopy := manifest
	manifestCopy.Artifacts = append([]addn.ManifestArtifact(nil), manifest.Artifacts...)

	return addn.ManifestResponse{
		Manifest:    manifestCopy,
		Status:      status,
		Revocations: revocations,
	}, nil
}

// GetArtifact returns an artifact payload enforcing residency and revocations.
func (c *EdgeCache) GetArtifact(dataset, version, artifactName, region string) (addn.ArtifactEnvelope, error) {
	c.mu.RLock()
	record, ok := c.datasets[datasetKey(dataset, version)]
	revocations := cloneRevocations(c.revocations)
	c.mu.RUnlock()
	if !ok {
		return addn.ArtifactEnvelope{}, fmt.Errorf("dataset version not found")
	}

	artifact, ok := record.artifacts[artifactName]
	if !ok {
		return addn.ArtifactEnvelope{}, fmt.Errorf("artifact not found")
	}

	if _, revoked := revocations.Artifacts[artifact.manifest.Digest]; revoked {
		return addn.ArtifactEnvelope{}, addn.ErrArtifactRevoked
	}

	if err := addn.VerifyResidency(record.manifest, region); err != nil {
		return addn.ArtifactEnvelope{}, err
	}

	return addn.ArtifactEnvelope{
		Name:      artifact.manifest.Name,
		Digest:    artifact.manifest.Digest,
		Content:   append([]byte(nil), artifact.content...),
		Residency: artifact.manifest.Residency,
	}, nil
}

// RevokeManifest marks a manifest digest as revoked.
func (c *EdgeCache) RevokeManifest(digest, reason string, now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.revocations.Manifests[digest] = addn.Revocation{Reason: reason, RevokedAt: now.UTC()}
	c.revocations.Version++
	c.revocations.UpdatedAt = now.UTC()
}

// RevokeArtifact marks an artifact digest as revoked.
func (c *EdgeCache) RevokeArtifact(digest, reason string, now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.revocations.Artifacts[digest] = addn.Revocation{Reason: reason, RevokedAt: now.UTC()}
	c.revocations.Version++
	c.revocations.UpdatedAt = now.UTC()
}

// RevocationList returns a copy of the current revocation data.
func (c *EdgeCache) RevocationList() addn.RevocationList {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return cloneRevocations(c.revocations)
}

func cloneRevocations(src addn.RevocationList) addn.RevocationList {
	copyList := addn.RevocationList{
		Version:   src.Version,
		UpdatedAt: src.UpdatedAt,
		Manifests: make(map[string]addn.Revocation, len(src.Manifests)),
		Artifacts: make(map[string]addn.Revocation, len(src.Artifacts)),
	}
	for k, v := range src.Manifests {
		copyList.Manifests[k] = v
	}
	for k, v := range src.Artifacts {
		copyList.Artifacts[k] = v
	}
	return copyList
}
