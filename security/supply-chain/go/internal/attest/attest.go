package attest

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"summit/security-supply-chain/internal/policy"
)

type Result struct {
	Artifact string `json:"artifact"`
	Digest   string `json:"digest"`
	Signer   string `json:"signer"`
	IssuedAt string `json:"issuedAt"`
}

func Sign(pol policy.Policy, artifactPath string) (Result, error) {
	data, err := os.ReadFile(artifactPath)
	if err != nil {
		return Result{}, err
	}
	sum := sha256.Sum256(data)
	signer := pol.Attestations.Signing
	rel := filepath.Base(artifactPath)
	attPath := filepath.Join(filepath.Dir(artifactPath), fmt.Sprintf("%s.attestation", rel))
	contents := fmt.Sprintf("artifact=%s\ndigest=sha256:%s\nsigner=%s\nissued_at=%s\n", rel, hex.EncodeToString(sum[:]), signer, time.Now().UTC().Format(time.RFC3339))
	if err := os.WriteFile(attPath, []byte(contents), 0o644); err != nil {
		return Result{}, err
	}
	return Result{
		Artifact: rel,
		Digest:   fmt.Sprintf("sha256:%s", hex.EncodeToString(sum[:])),
		Signer:   signer,
		IssuedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func CompliancePath(pol policy.Policy, artifact string) string {
	bucket := strings.TrimSuffix(pol.Attestations.ComplianceCenterBucket, "/")
	return fmt.Sprintf("%s/%s", bucket, filepath.Base(artifact))
}
