package risk

import (
	"testing"

	"platform/device-trust/internal/attestation"
)

func TestScoreNormalization(t *testing.T) {
	signal := attestation.PostureSignal{
		UserID: "user-1",
		WebAuthn: attestation.WebAuthnSignal{
			CredentialID: "cred",
			SignCount:    1,
			Transport:    "usb",
		},
		UserAgent: attestation.UserAgentHints{
			Platform: "macOS",
			Browser:  "Safari",
			Device:   "MacBook",
		},
		LocalChecks: []attestation.LocalCheck{
			{Name: "disk_encryption", Passed: true},
		},
	}

	result := Score(signal)
	if result.Score <= 0 || result.Score > 100 {
		t.Fatalf("unexpected score: %v", result.Score)
	}
	if result.Claims["device_hash"] == "" {
		t.Fatalf("expected device hash to be present")
	}
}
