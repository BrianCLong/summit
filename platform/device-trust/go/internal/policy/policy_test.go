package policy

import (
	"testing"

	"platform/device-trust/internal/attestation"
)

func TestPolicyEvaluation(t *testing.T) {
	policy := Policy{
		BlockList: BlockList{Browsers: []string{"Legacy"}},
		StepUp: StepUpRequirement{
			MinimumScore: 80,
			Factor:       "web-authn",
		},
		Downgrade: SessionDowngrade{
			MinimumScore: 60,
			Capabilities: []string{"download"},
		},
		PrivacyBudgetMin: 10,
	}

	signal := attestation.PostureSignal{
		UserID: "user-2",
		WebAuthn: attestation.WebAuthnSignal{
			CredentialID: "cred2",
			SignCount:    0,
			Transport:    "internal",
		},
		UserAgent: attestation.UserAgentHints{
			Platform: "windows",
			Browser:  "Chromium",
			Device:   "Surface",
		},
		LocalChecks: []attestation.LocalCheck{
			{Name: "disk_encryption", Passed: true},
			{Name: "os_version_supported", Passed: false},
		},
	}

	result := Evaluate(policy, signal)
	if result.PolicyVerdict != "step-up-required" && result.PolicyVerdict != "session-downgraded" && result.PolicyVerdict != "permit" {
		t.Fatalf("unexpected verdict %s", result.PolicyVerdict)
	}
}
