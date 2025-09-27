package policy

import (
	"testing"
	"time"

	"github.com/summit/mdeg/internal/config"
	"github.com/summit/mdeg/internal/provider"
)

func testCalculator() provider.CostCalculator {
	return provider.NewPricingTable(map[string]config.ProviderConfig{
		"aws": {
			Name:        "AWS",
			PricePerGiB: 0.1,
		},
	})
}

func basePolicyConfig() config.PolicyConfig {
	return config.PolicyConfig{
		ID:          "policy-1",
		DataClasses: []string{"restricted"},
		Destinations: []config.DestinationRule{
			{Provider: "aws", Bucket: "allowed", Region: "us-east-1"},
		},
		MaxBytes: 1024,
		MaxCost:  10,
		RateLimit: config.RateLimitConfig{
			BytesPerSecond: 256,
			BurstBytes:     256,
		},
		WindowSeconds: 3600,
	}
}

func TestPolicyAllowsWithinLimits(t *testing.T) {
	policy, err := NewPolicy(basePolicyConfig(), testCalculator())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	req := TransferRequest{
		RequestID: "req-1",
		Destination: Destination{
			Provider: "aws",
			Bucket:   "allowed",
			Region:   "us-east-1",
		},
		DataClass: "restricted",
		Bytes:     128,
	}

	outcome, err := policy.Evaluate(req)
	if err != nil {
		t.Fatalf("evaluate failed: %v", err)
	}
	if !outcome.Allowed {
		t.Fatalf("expected allowed, got %+v", outcome)
	}
	if outcome.Cost <= 0 {
		t.Fatalf("expected cost to be positive")
	}
}

func TestPolicyBlocksByteCap(t *testing.T) {
	policy, err := NewPolicy(basePolicyConfig(), testCalculator())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	req := TransferRequest{
		RequestID: "req-2",
		Destination: Destination{
			Provider: "aws",
			Bucket:   "allowed",
			Region:   "us-east-1",
		},
		DataClass: "restricted",
		Bytes:     2048,
	}

	outcome, err := policy.Evaluate(req)
	if err != nil {
		t.Fatalf("evaluate returned error: %v", err)
	}
	if outcome.Allowed {
		t.Fatalf("expected rejection when byte cap exceeded")
	}
}

func TestPolicyRateLimiter(t *testing.T) {
	cfg := basePolicyConfig()
	cfg.RateLimit.BytesPerSecond = 128
	cfg.RateLimit.BurstBytes = 128

	policy, err := NewPolicy(cfg, testCalculator())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	req := TransferRequest{
		RequestID:   "req-3",
		Destination: Destination{Provider: "aws", Bucket: "allowed", Region: "us-east-1"},
		DataClass:   "restricted",
		Bytes:       128,
	}

	outcome, err := policy.Evaluate(req)
	if err != nil {
		t.Fatalf("initial evaluate returned error: %v", err)
	}
	if !outcome.Allowed {
		t.Fatalf("expected initial request to be allowed")
	}

	outcome, err = policy.Evaluate(req)
	if err != nil {
		t.Fatalf("second evaluate returned error: %v", err)
	}
	if outcome.Allowed {
		t.Fatalf("expected rate limiter to reject second burst request")
	}

	time.Sleep(2 * time.Second)

	outcome, err = policy.Evaluate(req)
	if err != nil {
		t.Fatalf("evaluate after wait returned error: %v", err)
	}
	if !outcome.Allowed {
		t.Fatalf("expected allowance after limiter refill")
	}
}

func TestPolicyBlocksCostCap(t *testing.T) {
	cfg := basePolicyConfig()
	cfg.MaxCost = 0.0000001

	policy, err := NewPolicy(cfg, testCalculator())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	req := TransferRequest{
		RequestID:   "req-4",
		Destination: Destination{Provider: "aws", Bucket: "allowed", Region: "us-east-1"},
		DataClass:   "restricted",
		Bytes:       1024,
	}

	outcome, err := policy.Evaluate(req)
	if err != nil {
		t.Fatalf("evaluate returned error: %v", err)
	}
	if outcome.Allowed {
		t.Fatalf("expected cost cap rejection")
	}
}
