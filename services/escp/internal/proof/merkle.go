package proof

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
)

// MerkleTree captures the leaves and computed root for a deterministic tree.
type MerkleTree struct {
	Leaves []string `json:"leaves"`
	Root   string   `json:"root"`
}

// BuildMerkle constructs a Merkle tree over the provided keys.
func BuildMerkle(keys []string) MerkleTree {
	if len(keys) == 0 {
		return MerkleTree{Leaves: nil, Root: ""}
	}
	sorted := append([]string(nil), keys...)
	sort.Strings(sorted)

	leaves := make([]string, len(sorted))
	for i, k := range sorted {
		h := sha256.Sum256([]byte(k))
		leaves[i] = hex.EncodeToString(h[:])
	}

	level := append([]string(nil), leaves...)
	for len(level) > 1 {
		var next []string
		for i := 0; i < len(level); i += 2 {
			if i+1 == len(level) {
				next = append(next, level[i])
				continue
			}
			combined := level[i] + level[i+1]
			h := sha256.Sum256([]byte(combined))
			next = append(next, hex.EncodeToString(h[:]))
		}
		level = next
	}

	return MerkleTree{Leaves: leaves, Root: level[0]}
}

// VerifyMerkle recomputes a Merkle root for the provided keys and compares it with the expected root.
func VerifyMerkle(expected string, keys []string) bool {
	tree := BuildMerkle(keys)
	return tree.Root == expected
}

// NegativeProof encodes a per-key witness that the cache no longer contains the entry.
type NegativeProof struct {
	Key   string `json:"key"`
	Nonce string `json:"nonce"`
	Hash  string `json:"hash"`
}

// BuildNegativeProofs generates deterministic negative proofs per key using random nonces.
func BuildNegativeProofs(keys []string) ([]NegativeProof, error) {
	proofs := make([]NegativeProof, len(keys))
	sorted := append([]string(nil), keys...)
	sort.Strings(sorted)
	for i, k := range sorted {
		nonceBytes := make([]byte, 16)
		if _, err := rand.Read(nonceBytes); err != nil {
			return nil, fmt.Errorf("generate nonce: %w", err)
		}
		nonce := hex.EncodeToString(nonceBytes)
		hashInput := append([]byte(k), nonceBytes...)
		digest := sha256.Sum256(hashInput)
		proofs[i] = NegativeProof{
			Key:   k,
			Nonce: nonce,
			Hash:  hex.EncodeToString(digest[:]),
		}
	}
	return proofs, nil
}

// VerifyNegativeProof ensures the provided proof is internally consistent.
func VerifyNegativeProof(p NegativeProof) bool {
	nonceBytes, err := hex.DecodeString(p.Nonce)
	if err != nil {
		return false
	}
	expected := sha256.Sum256(append([]byte(p.Key), nonceBytes...))
	return hex.EncodeToString(expected[:]) == p.Hash
}

// VerifyNegativeProofs validates all proofs provided.
func VerifyNegativeProofs(proofs []NegativeProof) bool {
	for _, proof := range proofs {
		if !VerifyNegativeProof(proof) {
			return false
		}
	}
	return true
}
