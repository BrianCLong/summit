package main

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type Artifact struct {
	Path   string `json:"path"`
	SHA256 string `json:"sha256"`
	Bytes  int64  `json:"bytes"`
	Role   string `json:"role"`
}

type Transform struct {
	Op           string `json:"op"`
	Tool         string `json:"tool"`
	InputSHA256  string `json:"input_sha256"`
	OutputSHA256 string `json:"output_sha256"`
	Parameters   any    `json:"parameters,omitempty"`
	RanAt        string `json:"ranAt,omitempty"`
	Signer       string `json:"signer,omitempty"`
}

type Redaction struct {
	Field  string `json:"field"`
	Reason string `json:"reason"`
}

type Signature struct {
	Alg       string `json:"alg"`
	KeyID     string `json:"key_id"`
	Sig       string `json:"sig"`
	PublicKey string `json:"public_key,omitempty"`
	SignedAt  string `json:"signed_at,omitempty"`
}

type Manifest struct {
	Version    string         `json:"version"`
	CreatedAt  string         `json:"created_at"`
	ExportID   string         `json:"export_id"`
	Artifacts  []Artifact     `json:"artifacts"`
	Transforms []Transform    `json:"transforms"`
	Provenance map[string]any `json:"provenance"`
	Policy     struct {
		Redactions          []Redaction `json:"redactions"`
		SelectiveDisclosure bool        `json:"selectiveDisclosure,omitempty"`
		Notes               string      `json:"notes,omitempty"`
	} `json:"policy"`
	Signatures   []Signature `json:"signatures"`
	MerkleRoot   string      `json:"merkle_root"`
	Unverifiable []string    `json:"unverifiable,omitempty"`
}

type VerificationResult struct {
	Status string   `json:"status"`
	Issues []string `json:"issues"`
}

func loadManifest(manifestPath string) (*Manifest, error) {
	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, err
	}
	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

func computeFileSHA256(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256(data)
	return fmt.Sprintf("%x", digest[:]), nil
}

func computeMerkleRoot(digests []string) (string, error) {
	if len(digests) == 0 {
		return "", errors.New("no digests provided")
	}

	hashes := make([][]byte, 0, len(digests))
	for _, digest := range digests {
		if len(digest) != 64 {
			return "", fmt.Errorf("invalid digest length: %s", digest)
		}
		b, err := hex.DecodeString(digest)
		if err != nil {
			return "", fmt.Errorf("invalid digest %s: %w", digest, err)
		}
		hashes = append(hashes, b)
	}

	sort.Slice(hashes, func(i, j int) bool {
		return bytes.Compare(hashes[i], hashes[j]) < 0
	})

	for len(hashes) > 1 {
		var next [][]byte
		for i := 0; i < len(hashes); i += 2 {
			left := hashes[i]
			right := left
			if i+1 < len(hashes) {
				right = hashes[i+1]
			}
			sum := sha256.Sum256(append(left, right...))
			node := make([]byte, len(sum))
			copy(node, sum[:])
			next = append(next, node)
		}
		hashes = next
	}

	return hex.EncodeToString(hashes[0]), nil
}

func joinWithin(base, target string) (string, error) {
	cleaned := filepath.Clean(target)
	combined := filepath.Join(base, cleaned)
	absBase, err := filepath.Abs(base)
	if err != nil {
		return "", err
	}
	absCombined, err := filepath.Abs(combined)
	if err != nil {
		return "", err
	}
	if !strings.HasPrefix(absCombined, absBase) {
		return "", fmt.Errorf("path escapes bundle: %s", target)
	}
	return absCombined, nil
}

func verifyBundle(bundlePath string, manifest *Manifest) VerificationResult {
	var schemaIssues, tamperIssues, unverifiableIssues []string

	if manifest.Version == "" || manifest.ExportID == "" {
		schemaIssues = append(schemaIssues, "manifest missing required identifiers")
	}

	if len(manifest.Artifacts) == 0 {
		schemaIssues = append(schemaIssues, "manifest has no artifacts")
	}

	artifactDigests := make([]string, 0, len(manifest.Artifacts))
	artifactDigestSet := make(map[string]struct{})

	for _, artifact := range manifest.Artifacts {
		artifactPath, err := joinWithin(bundlePath, artifact.Path)
		if err != nil {
			tamperIssues = append(tamperIssues, err.Error())
			continue
		}
		digest, err := computeFileSHA256(artifactPath)
		if err != nil {
			if errors.Is(err, fs.ErrNotExist) {
				tamperIssues = append(tamperIssues, fmt.Sprintf("artifact missing: %s", artifact.Path))
			} else {
				unverifiableIssues = append(unverifiableIssues, err.Error())
			}
			continue
		}
		if !strings.EqualFold(digest, artifact.SHA256) {
			tamperIssues = append(tamperIssues, fmt.Sprintf("digest mismatch for %s", artifact.Path))
		}
		artifactDigests = append(artifactDigests, strings.ToLower(artifact.SHA256))
		artifactDigestSet[strings.ToLower(artifact.SHA256)] = struct{}{}
	}

	if len(artifactDigests) > 0 {
		merkle, err := computeMerkleRoot(artifactDigests)
		if err != nil {
			schemaIssues = append(schemaIssues, err.Error())
		} else if !strings.EqualFold(merkle, manifest.MerkleRoot) {
			tamperIssues = append(tamperIssues, "merkle root mismatch")
		}
	}

	for _, transform := range manifest.Transforms {
		digest := strings.ToLower(transform.OutputSHA256)
		if _, ok := artifactDigestSet[digest]; !ok {
			tamperIssues = append(tamperIssues, fmt.Sprintf("transform %s references unknown artifact", transform.Op))
		}
	}

	if len(manifest.Signatures) == 0 {
		unverifiableIssues = append(unverifiableIssues, "manifest has no signatures")
	}

	for _, signature := range manifest.Signatures {
		if signature.Alg == "ed25519" {
			if signature.PublicKey == "" {
				unverifiableIssues = append(unverifiableIssues, fmt.Sprintf("missing public key for %s", signature.KeyID))
				continue
			}
			pub, err := base64.StdEncoding.DecodeString(signature.PublicKey)
			if err != nil {
				schemaIssues = append(schemaIssues, fmt.Sprintf("invalid public key encoding for %s", signature.KeyID))
				continue
			}
			sig, err := base64.StdEncoding.DecodeString(signature.Sig)
			if err != nil {
				schemaIssues = append(schemaIssues, fmt.Sprintf("invalid signature encoding for %s", signature.KeyID))
				continue
			}
			message := []byte(strings.ToLower(manifest.MerkleRoot))
			if !ed25519.Verify(pub, message, sig) {
				tamperIssues = append(tamperIssues, fmt.Sprintf("signature verification failed for %s", signature.KeyID))
			}
		} else {
			unverifiableIssues = append(unverifiableIssues, fmt.Sprintf("unsupported signature algorithm %s", signature.Alg))
		}
	}

	for _, issue := range manifest.Unverifiable {
		unverifiableIssues = append(unverifiableIssues, issue)
	}

	switch {
	case len(schemaIssues) > 0:
		return VerificationResult{Status: "schema-mismatch", Issues: append(schemaIssues, append(tamperIssues, unverifiableIssues...)...)}
	case len(tamperIssues) > 0:
		return VerificationResult{Status: "tampered", Issues: append(tamperIssues, unverifiableIssues...)}
	case len(unverifiableIssues) > 0:
		return VerificationResult{Status: "unverifiable", Issues: unverifiableIssues}
	default:
		return VerificationResult{Status: "pass", Issues: nil}
	}
}
