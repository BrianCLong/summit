package policy

import "testing"

func TestGateVulnerabilities(t *testing.T) {
	p := Policy{BaselineCVSS: 7.0}
	findings := []Vulnerability{{ID: "CVE-1", CVSS: 9.0}, {ID: "CVE-2", CVSS: 5.0}}
	failing, ok := GateVulnerabilities(findings, p)
	if ok || len(failing) != 1 || failing[0].ID != "CVE-1" {
		t.Fatalf("expected failing CVE-1, got %+v", failing)
	}
}

func TestGateLicensesDualControl(t *testing.T) {
	p := Policy{BlockedLicenses: []string{"BUSL-1.1"}, DualControl: DualControl{MinimumApprovers: 2}}
	licenses := []string{"MIT", "BUSL-1.1"}
	exceptions := []LicenseException{{License: "BUSL-1.1", Approvers: []string{"a@example.com", "b@example.com"}}}
	blocked, ok, err := GateLicenses(licenses, exceptions, p)
	if err != nil || !ok || len(blocked) != 0 {
		t.Fatalf("expected dual-control exception to pass and clear blocks: blocked=%v err=%v ok=%v", blocked, err, ok)
	}
}

func TestValidateAttestation(t *testing.T) {
	p := Policy{ReproducibleBuilds: ReproducibleBuilds{AttestationRequired: true}}
	if err := ValidateAttestation(false, p); err == nil {
		t.Fatal("expected attestation requirement to fail")
	}
}
