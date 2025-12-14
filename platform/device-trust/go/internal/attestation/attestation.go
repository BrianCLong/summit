package attestation

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

type WebAuthnSignal struct {
	CredentialID string `json:"credentialId"`
	SignCount    uint32 `json:"signCount"`
	Transport    string `json:"transport"`
}

type UserAgentHints struct {
	Platform string `json:"platform"`
	Browser  string `json:"browser"`
	Device   string `json:"device"`
}

type LocalCheck struct {
	Name    string `json:"name"`
	Passed  bool   `json:"passed"`
	Details string `json:"details"`
}

type PostureSignal struct {
	UserID           string         `json:"userId"`
	WebAuthn         WebAuthnSignal `json:"webauthn"`
	UserAgent        UserAgentHints `json:"userAgent"`
	LocalChecks      []LocalCheck   `json:"localChecks"`
	DeviceIdentifier string         `json:"deviceIdentifier"`
}

// DeriveDeviceHash builds a deterministic hash from the WebAuthn credential and
// UA hints to support privacy-preserving posture claims without exposing
// fingerprintable raw values.
func DeriveDeviceHash(signal PostureSignal) string {
	source := strings.Join([]string{
		signal.WebAuthn.CredentialID,
		signal.UserAgent.Platform,
		signal.UserAgent.Browser,
		signal.UserAgent.Device,
	}, "|")
	digest := sha256.Sum256([]byte(source))
	return hex.EncodeToString(digest[:])
}

func EvaluateLocalChecks(checks []LocalCheck) (passed []LocalCheck, failed []LocalCheck) {
	for _, check := range checks {
		if check.Passed {
			passed = append(passed, check)
			continue
		}
		failed = append(failed, check)
	}
	return passed, failed
}

func SupportsHardwareTransport(signal PostureSignal) bool {
	transport := strings.ToLower(signal.WebAuthn.Transport)
	return strings.Contains(transport, "usb") || strings.Contains(transport, "nfc") || strings.Contains(transport, "ble")
}
