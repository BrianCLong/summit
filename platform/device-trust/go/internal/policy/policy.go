package policy

import (
	"platform/device-trust/internal/attestation"
	"platform/device-trust/internal/risk"
)

type BlockList struct {
	UserIDs   []string `json:"userIds"`
	Devices   []string `json:"devices"`
	Browsers  []string `json:"browsers"`
	Platforms []string `json:"platforms"`
}

type StepUpRequirement struct {
	MinimumScore float64 `json:"minimumScore"`
	Factor       string  `json:"factor"`
}

type SessionDowngrade struct {
	MinimumScore float64  `json:"minimumScore"`
	Capabilities []string `json:"capabilities"`
}

type Policy struct {
	BlockList        BlockList         `json:"blockList"`
	StepUp           StepUpRequirement `json:"stepUp"`
	Downgrade        SessionDowngrade  `json:"downgrade"`
	OfflineMode      bool              `json:"offlineMode"`
	PrivacyBudgetMin float64           `json:"privacyBudgetMin"`
}

func contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}

func blocked(blockList BlockList, signal attestation.PostureSignal, score risk.ScoreResult) (bool, string) {
	if contains(blockList.UserIDs, signal.UserID) {
		return true, "user blocked"
	}
	if contains(blockList.Devices, score.DeviceHash) {
		return true, "device blocked"
	}
	if contains(blockList.Browsers, signal.UserAgent.Browser) {
		return true, "browser blocked"
	}
	if contains(blockList.Platforms, signal.UserAgent.Platform) {
		return true, "platform blocked"
	}
	return false, ""
}

func Evaluate(policy Policy, signal attestation.PostureSignal) risk.ScoreResult {
	result := risk.Score(signal)

	if policy.OfflineMode {
		result.PolicyVerdict = "offline-permit"
		result.Reasons = append(result.Reasons, "offline session allowed")
		return result
	}

	if blocked, reason := blocked(policy.BlockList, signal, result); blocked {
		result.PolicyVerdict = "deny"
		result.Reasons = append(result.Reasons, reason)
		return result
	}

	if result.Score < policy.PrivacyBudgetMin {
		result.PolicyVerdict = "deny"
		result.Reasons = append(result.Reasons, "insufficient privacy budget")
		return result
	}

	if result.Score < policy.StepUp.MinimumScore {
		result.PolicyVerdict = "step-up-required"
		result.Claims["step_up_factor"] = policy.StepUp.Factor
		result.Reasons = append(result.Reasons, "step-up required for score")
		return result
	}

	if result.Score < policy.Downgrade.MinimumScore {
		result.PolicyVerdict = "session-downgraded"
		result.Claims["downgraded_capabilities"] = "limited"
		result.Reasons = append(result.Reasons, "capabilities reduced for score")
		return result
	}

	result.PolicyVerdict = "permit"
	return result
}
