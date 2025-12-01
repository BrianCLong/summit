package systems

import (
	"context"

	"github.com/summit/lho/internal/model"
)

// Report captures the result of applying a hold to a system.
type Report struct {
	FrozenResources   []string
	Snapshotted       []string
	Tagged            map[string]map[string]string
	FingerprintValues []string
}

// System describes a storage or messaging substrate that can participate in a
// legal hold.
type System interface {
	Name() string
	ApplyHold(ctx context.Context, scope model.Scope, freeze, snapshot bool, tags map[string]string, preventTTL bool) (Report, error)
	Verify(ctx context.Context, scope model.Scope) error
}

// Fingerprint produces canonical state descriptions for the supplied resource
// identifiers. The orchestrator uses this to produce custody proofs.
type Fingerprint interface {
	Fingerprint(scope model.Scope) ([]string, error)
}

// HoldLifecycle represents systems that expose TTL or RTBF processing that must
// be paused while a hold is active.
type HoldLifecycle interface {
	PauseExpirations(ids []string)
}
