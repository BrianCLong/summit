package orchestrator

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"
)

// ComputeMerkleRoot calculates a deterministic Merkle root of record identifiers.
func ComputeMerkleRoot(ids []string) string {
	if len(ids) == 0 {
		return ""
	}
	hashed := make([][]byte, len(ids))
	sorted := append([]string{}, ids...)
	sort.Strings(sorted)
	for i, id := range sorted {
		h := sha256.Sum256([]byte(id))
		hashed[i] = h[:]
	}

	for len(hashed) > 1 {
		nextLevel := make([][]byte, 0, (len(hashed)+1)/2)
		for i := 0; i < len(hashed); i += 2 {
			if i+1 >= len(hashed) {
				combined := append(hashed[i], hashed[i]...)
				sum := sha256.Sum256(combined)
				nextLevel = append(nextLevel, sum[:])
				continue
			}
			combined := append(hashed[i], hashed[i+1]...)
			sum := sha256.Sum256(combined)
			nextLevel = append(nextLevel, sum[:])
		}
		hashed = nextLevel
	}

	return hex.EncodeToString(hashed[0])
}

// VerifyMerkleRoot recomputes the root to allow offline validation.
func VerifyMerkleRoot(ids []string, expected string) bool {
	return ComputeMerkleRoot(ids) == expected
}
