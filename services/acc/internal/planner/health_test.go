package planner_test

import (
	"testing"
	"time"

	"github.com/summit/acc/internal/config"
	"github.com/summit/acc/internal/health"
	"github.com/summit/acc/internal/planner"
)

func TestHealthGateFallback(t *testing.T) {
	// Setup config with Strong consistency rule
	cfg := &config.Config{
		Policies: []config.PolicyRule{
			{
				DataClass:    "critical",
				Mode:         config.ModeStrong,
				StalenessSLA: 0,
			},
		},
		Replicas: []config.Replica{
			{Name: "primary", Region: "us-east", Role: "primary", DefaultLatencyMs: 10, Synchronous: true},
			{Name: "secondary", Region: "us-west", Role: "secondary", DefaultLatencyMs: 50, Synchronous: true},
			{Name: "tertiary", Region: "eu-west", Role: "secondary", DefaultLatencyMs: 100, Synchronous: true},
		},
	}

	p := planner.New(cfg)
	gk := health.NewGateKeeper(health.DefaultGateConfig())
	p.SetGateKeeper(gk)

	// Simulate healthy tenant
	tenantID := "tenant-healthy"
	gk.UpdateMetrics(tenantID, health.TenantMetrics{
		WriteP95Ms:   100,
		ConflictRate: 0.001,
		QuorumRTTMs:  50,
		LastUpdated:  time.Now(),
	})

	req := planner.Request{
		TenantID:  tenantID,
		Operation: "write",
		DataClass: "critical",
		Session:   "sess-1",
	}

	// 1. Verify healthy tenant gets Quorum (Strong mode)
	plan, err := p.Plan(nil, req)
	if err != nil {
		t.Fatalf("Plan failed: %v", err)
	}
	if len(plan.Route.Quorum) < 2 {
		t.Errorf("Expected quorum size >= 2 for healthy tenant, got %d", len(plan.Route.Quorum))
	}

	// Simulate unhealthy tenant (high latency)
	unhealthyTenantID := "tenant-unhealthy"
	gk.UpdateMetrics(unhealthyTenantID, health.TenantMetrics{
		WriteP95Ms:   800, // > 700ms threshold
		ConflictRate: 0.001,
		QuorumRTTMs:  50,
		LastUpdated:  time.Now(),
	})

	reqUnhealthy := planner.Request{
		TenantID:  unhealthyTenantID,
		Operation: "write",
		DataClass: "critical",
		Session:   "sess-2",
	}

	// 2. Verify unhealthy tenant falls back to Primary
	planUnhealthy, err := p.Plan(nil, reqUnhealthy)
	if err != nil {
		t.Fatalf("Plan failed: %v", err)
	}

	// Should fallback to primary only
	if len(planUnhealthy.Route.Quorum) != 1 {
		t.Errorf("Expected quorum size 1 (primary only) for unhealthy tenant, got %d", len(planUnhealthy.Route.Quorum))
	}
	if planUnhealthy.Route.Quorum[0] != "primary" {
		t.Errorf("Expected primary to be selected in fallback, got %s", planUnhealthy.Route.Quorum[0])
	}

	// Check explanation
	foundFallbackMsg := false
	for _, step := range planUnhealthy.Explain {
		if step.Stage == "health-gate" {
			foundFallbackMsg = true
			break
		}
	}
	if !foundFallbackMsg {
		t.Error("Expected explanation to mention health-gate fallback")
	}
}

func TestHealthGateNoMetrics(t *testing.T) {
	cfg := &config.Config{
		Policies: []config.PolicyRule{
			{DataClass: "critical", Mode: config.ModeStrong},
		},
		Replicas: []config.Replica{
			{Name: "primary", Region: "us-east", Role: "primary"},
		},
	}
	p := planner.New(cfg)
	// Tenant with no metrics should fail closed (fallback) by default safety policy
	req := planner.Request{
		TenantID:  "tenant-unknown",
		Operation: "write",
		DataClass: "critical",
	}

	plan, err := p.Plan(nil, req)
	if err != nil {
		t.Fatalf("Plan failed: %v", err)
	}

	// Should fallback
	foundFallbackMsg := false
	for _, step := range plan.Explain {
		if step.Stage == "health-gate" {
			foundFallbackMsg = true
			break
		}
	}
	if !foundFallbackMsg {
		t.Error("Expected unknown tenant to trigger health-gate fallback")
	}
}
