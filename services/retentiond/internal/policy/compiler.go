package policy

import (
	"time"

	"github.com/summit/services/retentiond/internal/config"
)

// CompiledPolicy is a resolved representation of a policy for a given point in time.
type CompiledPolicy struct {
	Policy  config.Policy
	Cutoff  time.Time
	Targets []CompiledTarget
}

// CompiledTarget describes a retention target with a concrete cutoff timestamp.
type CompiledTarget struct {
	Config config.Target
	Cutoff time.Time
}

// Compile resolves a policy relative to the reference time.
func Compile(pol config.Policy, now time.Time) CompiledPolicy {
	cutoff := pol.CompileTimestamp(now)
	targets := make([]CompiledTarget, len(pol.Targets))
	for i, target := range pol.Targets {
		targets[i] = CompiledTarget{Config: target, Cutoff: cutoff}
	}
	return CompiledPolicy{Policy: pol, Cutoff: cutoff, Targets: targets}
}
