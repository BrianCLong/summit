package consentplayground

import (
  "testing"

  consentguard "ccc/consentguard"
)

func TestAllowsApprovedPurposes(t *testing.T) {
  consentguard.ResetTelemetry()
  guard, err := consentguard.WithConsent("profile.read", "analytics")
  if err != nil {
    t.Fatalf("unexpected error: %v", err)
  }

  result, err := guard(func() (any, error) {
    return map[string]bool{"ok": true}, nil
  })
  if err != nil {
    t.Fatalf("guard returned error: %v", err)
  }
  payload := result.(map[string]bool)
  if !payload["ok"] {
    t.Fatalf("expected ok payload")
  }

  telemetry := consentguard.GetTelemetry()
  if len(telemetry) != 1 {
    t.Fatalf("expected telemetry entry")
  }
  if telemetry[0].LawfulBasis != "legitimate_interest" {
    t.Fatalf("unexpected lawful basis %s", telemetry[0].LawfulBasis)
  }
}

func TestBlocksDisallowedPurpose(t *testing.T) {
  _, err := consentguard.WithConsent("profile.read", "advertising")
  if err == nil {
    t.Fatal("expected error for disallowed purpose")
  }
}
