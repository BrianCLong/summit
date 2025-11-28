package risk

import (
	"math"

	"platform/device-trust/internal/attestation"
)

type ScoreResult struct {
	UserID        string            `json:"userId"`
	DeviceHash    string            `json:"deviceHash"`
	Score         float64           `json:"score"`
	Reasons       []string          `json:"reasons"`
	Claims        map[string]string `json:"claims"`
	PolicyVerdict string            `json:"policyVerdict"`
}

func computeBase(signal attestation.PostureSignal) (float64, []string) {
	score := 90.0
	reasons := []string{"WebAuthn present"}

	if signal.WebAuthn.SignCount == 0 {
		score -= 20
		reasons = append(reasons, "credential sign count missing")
	}

	if !attestation.SupportsHardwareTransport(signal) {
		score -= 10
		reasons = append(reasons, "non-hardware WebAuthn transport")
	}

	for _, check := range signal.LocalChecks {
		if !check.Passed {
			score -= 8
			reasons = append(reasons, check.Name)
		}
	}

	if score < 0 {
		score = 0
	}

	return score, reasons
}

func normalize(score float64) float64 {
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return math.Round(score*100) / 100
}

func Score(signal attestation.PostureSignal) ScoreResult {
	base, reasons := computeBase(signal)
	deviceHash := attestation.DeriveDeviceHash(signal)

	claims := map[string]string{
		"device_hash": deviceHash,
		"user":        signal.UserID,
		"ua_platform": signal.UserAgent.Platform,
	}

	return ScoreResult{
		UserID:        signal.UserID,
		DeviceHash:    deviceHash,
		Score:         normalize(base),
		Reasons:       reasons,
		Claims:        claims,
		PolicyVerdict: "review",
	}
}
