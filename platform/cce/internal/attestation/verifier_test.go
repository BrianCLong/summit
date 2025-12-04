package attestation

import "testing"

func TestVerifyQuoteSuccess(t *testing.T) {
	v := NewVerifier("abc123", []string{"us-east-1"}, []Quote{{ID: "q1", Region: "us-east-1", Measurement: "abc123"}})
	if err := v.Verify("attest:q1:us-east-1:abc123", "", "us-east-1"); err != nil {
		t.Fatalf("expected success, got %v", err)
	}
}

func TestVerifyQuoteRegionDenied(t *testing.T) {
	v := NewVerifier("abc123", []string{"us-east-1"}, []Quote{{ID: "q1", Region: "us-east-1", Measurement: "abc123"}})
	if err := v.Verify("attest:q1:us-east-1:abc123", "", "eu-west-1"); err == nil {
		t.Fatal("expected region denial")
	}
}

func TestParseQuoteMalformed(t *testing.T) {
	if _, err := ParseQuote("badquote"); err == nil {
		t.Fatal("expected parse error")
	}
}

func TestDeriveMeasurementDeterministic(t *testing.T) {
	a := DeriveMeasurement("hello")
	b := DeriveMeasurement("hello")
	if a != b {
		t.Fatalf("expected deterministic measurement, got %s and %s", a, b)
	}
}
