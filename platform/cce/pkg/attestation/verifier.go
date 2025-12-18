package attestation

import (
	"crypto/sha256"
	"errors"
	"fmt"
)

// Quote encapsulates a raw attestation quote and its PCR summary.
type Quote struct {
	Raw       []byte
	PCRDigest []byte
	Region    string
}

// Policy defines what PCR digests and regions are acceptable.
type Policy struct {
	AllowedPCRs   [][]byte
	AllowedRegion string
}

// Verifier validates quotes for known measurements.
type Verifier struct {
	policy Policy
}

func NewVerifier(policy Policy) *Verifier {
	return &Verifier{policy: policy}
}

// Verify ensures the quote digest matches policy and region.
func (v *Verifier) Verify(q Quote) error {
	if q.Region != v.policy.AllowedRegion {
		return fmt.Errorf("quote region %s is not allowed", q.Region)
	}

	for _, allowed := range v.policy.AllowedPCRs {
		if sha256.Sum256(q.PCRDigest) == sha256.Sum256(allowed) {
			return nil
		}
	}

	return errors.New("attestation quote digest rejected")
}

// VectorFromQuotes checks all quotes and returns first failure.
func (v *Verifier) VectorFromQuotes(quotes []Quote) error {
	for _, q := range quotes {
		if err := v.Verify(q); err != nil {
			return err
		}
	}
	return nil
}
