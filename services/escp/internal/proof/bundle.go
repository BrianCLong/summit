package proof

import "sort"

// SystemProof combines Merkle and negative proofs for a single backend.
type SystemProof struct {
	System         string          `json:"system"`
	Classification string          `json:"classification"`
	Keys           []string        `json:"keys"`
	Merkle         *MerkleTree     `json:"merkle,omitempty"`
	NegativeProofs []NegativeProof `json:"negativeProofs,omitempty"`
}

// Verify ensures the proof internally matches its key material.
func (p SystemProof) Verify() bool {
	switch p.Classification {
	case "cache":
		if len(p.Keys) == 0 {
			return true
		}
		if len(p.NegativeProofs) == 0 {
			return false
		}
		if !VerifyNegativeProofs(p.NegativeProofs) {
			return false
		}
		if len(p.NegativeProofs) != len(p.Keys) {
			return false
		}
		sorted := sortedCopy(p.Keys)
		for i, key := range sorted {
			if p.NegativeProofs[i].Key != key {
				return false
			}
		}
		return true
	default:
		if p.Merkle == nil {
			return len(p.Keys) == 0
		}
		return VerifyMerkle(p.Merkle.Root, p.Keys)
	}
}

func sortedCopy(keys []string) []string {
	out := append([]string(nil), keys...)
	sort.Strings(out)
	return out
}
