package privacy

import "platform/device-trust/internal/attestation"

var allowedChecks = map[string]bool{
	"disk_encryption":      true,
	"screen_lock":          true,
	"os_version_supported": true,
}

// Filter removes any signals that would collect invasive data while preserving
// posture integrity for downstream risk evaluation.
func Filter(signal attestation.PostureSignal) attestation.PostureSignal {
	filtered := []attestation.LocalCheck{}
	for _, check := range signal.LocalChecks {
		if allowedChecks[check.Name] {
			filtered = append(filtered, check)
		}
	}
	signal.LocalChecks = filtered
	signal.DeviceIdentifier = "" // prevent persistent raw identifiers
	return signal
}
