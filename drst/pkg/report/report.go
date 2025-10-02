package report

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"
)

type RoutingViolation struct {
	TransactionID  string   `json:"transactionId"`
	Jurisdiction   string   `json:"jurisdiction"`
	Endpoint       string   `json:"endpoint"`
	ObservedRegion string   `json:"observedRegion"`
	AllowedRegions []string `json:"allowedRegions"`
	ObservedHops   []string `json:"observedHops"`
	ObservedIPs    []string `json:"observedIps"`
}

type StorageViolation struct {
	Bucket         string   `json:"bucket"`
	ArtifactID     string   `json:"artifactId"`
	ObservedRegion string   `json:"observedRegion"`
	AllowedRegions []string `json:"allowedRegions"`
}

type NegativeProof struct {
	Bucket      string   `json:"bucket"`
	MerkleRoot  string   `json:"merkleRoot"`
	HashesUsed  []string `json:"hashesUsed"`
	Description string   `json:"description"`
}

type ComplianceMap struct {
	RoutingViolations []RoutingViolation `json:"routingViolations"`
	StorageViolations []StorageViolation `json:"storageViolations"`
	NegativeProofs    []NegativeProof    `json:"negativeProofs"`
}

func BuildNegativeProof(bucket string, artifactIDs []string) NegativeProof {
	if len(artifactIDs) == 0 {
		return NegativeProof{
			Bucket:      bucket,
			MerkleRoot:  "",
			HashesUsed:  nil,
			Description: "no artifacts present; trivially compliant",
		}
	}
	hashes := make([][]byte, len(artifactIDs))
	copyIDs := append([]string(nil), artifactIDs...)
	sort.Strings(copyIDs)
	for i, id := range copyIDs {
		sum := sha256.Sum256([]byte(id))
		slice := make([]byte, len(sum))
		copy(slice, sum[:])
		hashes[i] = slice
	}
	root, trace := merkleRoot(hashes)
	flat := make([]string, len(trace))
	for i, h := range trace {
		flat[i] = hex.EncodeToString(h)
	}
	return NegativeProof{
		Bucket:      bucket,
		MerkleRoot:  hex.EncodeToString(root),
		HashesUsed:  flat,
		Description: "merkle root derived from sorted artifact identifiers",
	}
}

func merkleRoot(hashes [][]byte) ([]byte, [][]byte) {
	if len(hashes) == 0 {
		empty := sha256.Sum256(nil)
		return empty[:], nil
	}
	level := make([][]byte, len(hashes))
	for i, h := range hashes {
		cp := make([]byte, len(h))
		copy(cp, h)
		level[i] = cp
	}
	proof := make([][]byte, 0)
	for len(level) > 1 {
		var next [][]byte
		for i := 0; i < len(level); i += 2 {
			if i+1 == len(level) {
				next = append(next, level[i])
				continue
			}
			combined := append(append([]byte{}, level[i]...), level[i+1]...)
			sum := sha256.Sum256(combined)
			proof = append(proof, level[i], level[i+1])
			next = append(next, sum[:])
		}
		level = next
	}
	return level[0], proof
}
