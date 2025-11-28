package attestation

import "testing"

func TestVerifierAcceptsKnownDigest(t *testing.T) {
	digest := []byte{0x01, 0x02}
	v := NewVerifier(Policy{AllowedPCRs: [][]byte{digest}, AllowedRegion: "us-east-1"})
	if err := v.Verify(Quote{PCRDigest: digest, Region: "us-east-1"}); err != nil {
		t.Fatalf("expected digest to verify, got %v", err)
	}
}

func TestVerifierRejectsWrongRegion(t *testing.T) {
	digest := []byte{0x01, 0x02}
	v := NewVerifier(Policy{AllowedPCRs: [][]byte{digest}, AllowedRegion: "us-east-1"})
	if err := v.Verify(Quote{PCRDigest: digest, Region: "eu-west-1"}); err == nil {
		t.Fatalf("expected region mismatch to fail")
	}
}
