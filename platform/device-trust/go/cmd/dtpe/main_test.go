package main

import "testing"

func TestScoreComputesRisk(t *testing.T) {
  att := newAttestor()
  req := attestRequest{
    DeviceID: "dev1",
    SecureContext: true,
    WebAuthn: webAuthnSignal{UserVerified: true, UserPresent: true},
    UserAgent: uaHints{Platform: "Windows 11", Architecture: "arm64"},
    Local: localChecks{FirewallEnabled: true, DiskEncrypted: true, ScreenLock: true},
  }

  res := att.score(req)
  if res.Status != "pass" {
    t.Fatalf("expected pass, got %s", res.Status)
  }
  if res.RiskScore != 0 {
    t.Fatalf("expected zero risk, got %d", res.RiskScore)
  }
  if res.Claims["posture:assurance"] != "high" {
    t.Fatalf("unexpected assurance: %v", res.Claims["posture:assurance"])
  }
}

func TestBlockList(t *testing.T) {
  att := newAttestor()
  req := attestRequest{
    DeviceID: "legacy",
    SecureContext: true,
    WebAuthn: webAuthnSignal{UserVerified: false, UserPresent: false},
    UserAgent: uaHints{Platform: "Windows 7", Architecture: "x86"},
    Local: localChecks{FirewallEnabled: false},
  }

  res := att.score(req)
  if res.Status != "block" {
    t.Fatalf("expected block, got %s", res.Status)
  }
  if res.RiskScore < 70 {
    t.Fatalf("expected high risk, got %d", res.RiskScore)
  }
}

func TestOfflineHint(t *testing.T) {
  att := newAttestor()
  req := attestRequest{
    DeviceID: "offline",
    SecureContext: true,
    WebAuthn: webAuthnSignal{UserVerified: true, UserPresent: true},
    UserAgent: uaHints{Platform: "macOS", Architecture: "arm64"},
    Local: localChecks{FirewallEnabled: true, OfflineMode: true},
  }

  res := att.score(req)
  if res.OfflineHint == "" {
    t.Fatalf("expected offline hint to be set")
  }
  if res.Claims["posture:offline"] != true {
    t.Fatalf("expected posture:offline claim")
  }
}
