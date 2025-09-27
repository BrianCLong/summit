package risk

import "strings"

// DevicePostureScorer raises risk when the reported device posture is not trusted.
type DevicePostureScorer struct {
	Name            string
	TrustedPostures []string
}

func (d DevicePostureScorer) Score(in Input) Result {
	result := Result{Name: chooseName(d.Name, "device_posture")}
	posture := strings.ToLower(strings.TrimSpace(in.Signals.DevicePosture))
	if posture == "" {
		result.Level = LevelMedium
		result.Score = 0.65
		result.Reasons = []string{"device posture unavailable"}
		return result
	}

	for _, trusted := range d.TrustedPostures {
		if posture == strings.ToLower(strings.TrimSpace(trusted)) {
			result.Level = LevelLow
			result.Score = 0.2
			result.Reasons = []string{"device posture trusted"}
			return result
		}
	}

	result.Level = LevelHigh
	result.Score = 0.92
	result.Reasons = []string{"untrusted device posture"}
	return result
}
