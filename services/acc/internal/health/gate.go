package health

import (
	"fmt"
	"sync"
	"time"
)

// GateConfig defines the thresholds for the health gate.
type GateConfig struct {
	MaxWriteP95Ms    int     `yaml:"max_write_p95_ms"`
	MaxConflictRate  float64 `yaml:"max_conflict_rate"` // e.g., 0.005 for 0.5%
	MaxQuorumRTTMs   int     `yaml:"max_quorum_rtt_ms"`
}

// DefaultGateConfig returns the default safety thresholds.
func DefaultGateConfig() GateConfig {
	return GateConfig{
		MaxWriteP95Ms:   700,
		MaxConflictRate: 0.005,
		MaxQuorumRTTMs:  200,
	}
}

// TenantMetrics holds the current health metrics for a tenant.
type TenantMetrics struct {
	WriteP95Ms   int
	ConflictRate float64
	QuorumRTTMs  int
	LastUpdated  time.Time
}

// GateKeeper manages health gates for tenants.
type GateKeeper struct {
	mu      sync.RWMutex
	metrics map[string]TenantMetrics
	config  GateConfig
}

// NewGateKeeper creates a new GateKeeper with the provided config.
func NewGateKeeper(cfg GateConfig) *GateKeeper {
	return &GateKeeper{
		metrics: make(map[string]TenantMetrics),
		config:  cfg,
	}
}

// UpdateMetrics updates the metrics for a given tenant.
func (g *GateKeeper) UpdateMetrics(tenantID string, metrics TenantMetrics) {
	g.mu.Lock()
	defer g.mu.Unlock()
	metrics.LastUpdated = time.Now()
	g.metrics[tenantID] = metrics
}

// Check returns true if the tenant passes the health gate, false otherwise.
// It also returns the reason for failure if any.
func (g *GateKeeper) Check(tenantID string) (bool, string) {
	g.mu.RLock()
	metrics, ok := g.metrics[tenantID]
	g.mu.RUnlock()

	if !ok {
		// Default to closed if no metrics (safety first) or open?
		// Plan says "Enabling a tenant requires passing health gate".
		// If no metrics, we can't be sure, so probably fail safe.
		// However, for initial rollout, maybe we default to true if not tracked?
		// Let's assume fail-safe: if we don't know, we don't enable quorum.
		return false, "no metrics available"
	}

	if metrics.WriteP95Ms > g.config.MaxWriteP95Ms {
		return false, fmt.Sprintf("p95 latency %dms > %dms", metrics.WriteP95Ms, g.config.MaxWriteP95Ms)
	}

	if metrics.ConflictRate > g.config.MaxConflictRate {
		return false, fmt.Sprintf("conflict rate %.2f%% > %.2f%%", metrics.ConflictRate*100, g.config.MaxConflictRate*100)
	}

	if metrics.QuorumRTTMs > g.config.MaxQuorumRTTMs {
		return false, fmt.Sprintf("quorum RTT %dms > %dms", metrics.QuorumRTTMs, g.config.MaxQuorumRTTMs)
	}

	return true, ""
}
