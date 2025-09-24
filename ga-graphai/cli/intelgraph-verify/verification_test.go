package main

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type manifestAlias Manifest

func writeManifest(t *testing.T, dir string, manifest *Manifest) {
	t.Helper()
	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal manifest: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "manifest.json"), data, 0o600); err != nil {
		t.Fatalf("failed to write manifest: %v", err)
	}
}

func TestVerifyBundlePasses(t *testing.T) {
	dir := t.TempDir()
	evidence := []byte("sample evidence")
	if err := os.WriteFile(filepath.Join(dir, "evidence.txt"), evidence, 0o600); err != nil {
		t.Fatalf("failed to write artifact: %v", err)
	}
	digest := sha256.Sum256(evidence)
	hexDigest := fmt.Sprintf("%x", digest[:])

	_, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	merkle := hexDigest
	signature := ed25519.Sign(priv, []byte(merkle))

	manifest := &Manifest{
		Version:    "0.1",
		CreatedAt:  "2025-09-01T00:00:00Z",
		ExportID:   "export-1",
		Artifacts:  []Artifact{{Path: "evidence.txt", SHA256: merkle, Bytes: int64(len(evidence)), Role: "source"}},
		Transforms: []Transform{},
		Signatures: []Signature{{
			Alg:       "ed25519",
			KeyID:     "test",
			Sig:       base64.StdEncoding.EncodeToString(signature),
			PublicKey: base64.StdEncoding.EncodeToString(priv.Public().(ed25519.PublicKey)),
		}},
		MerkleRoot: merkle,
	}

	writeManifest(t, dir, manifest)

	result := verifyBundle(dir, manifest)
	if result.Status != "pass" {
		t.Fatalf("expected pass got %s: %v", result.Status, result.Issues)
	}
}

func TestVerifyBundleDetectsTamper(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "artifact.txt"), []byte("one"), 0o600); err != nil {
		t.Fatalf("failed to write artifact: %v", err)
	}
	manifest := &Manifest{
		Version:    "0.1",
		CreatedAt:  "2025-09-01T00:00:00Z",
		ExportID:   "export-1",
		Artifacts:  []Artifact{{Path: "artifact.txt", SHA256: strings.Repeat("0", 64), Bytes: 3, Role: "source"}},
		MerkleRoot: strings.Repeat("0", 64),
	}
	writeManifest(t, dir, manifest)
	result := verifyBundle(dir, manifest)
	if result.Status != "tampered" {
		t.Fatalf("expected tampered got %s", result.Status)
	}
}

func TestVerifyBundleUnverifiableWithoutSignature(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "artifact.txt"), []byte("content"), 0o600); err != nil {
		t.Fatalf("failed to write artifact: %v", err)
	}
	digest := sha256.Sum256([]byte("content"))
	merkle := fmt.Sprintf("%x", digest[:])
	manifest := &Manifest{
		Version:    "0.1",
		CreatedAt:  "2025-09-01T00:00:00Z",
		ExportID:   "export-2",
		Artifacts:  []Artifact{{Path: "artifact.txt", SHA256: merkle, Bytes: 7, Role: "source"}},
		MerkleRoot: merkle,
	}
	writeManifest(t, dir, manifest)
	result := verifyBundle(dir, manifest)
	if result.Status != "unverifiable" {
		t.Fatalf("expected unverifiable got %s", result.Status)
	}
}
