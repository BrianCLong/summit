package service

import "fmt"

// priceCalculator computes charges for policy tiers.
type priceCalculator struct {
	currency string
	policies map[PolicyKey]PolicyConfig
}

func newPriceCalculator(cfg Config) *priceCalculator {
	policies := make(map[PolicyKey]PolicyConfig, len(cfg.Policies))
	for _, p := range cfg.Policies {
		key := PolicyKey{PolicyTier: p.PolicyTier, Residency: p.Residency}
		policies[key] = p
	}
	return &priceCalculator{currency: cfg.Currency, policies: policies}
}

func (c *priceCalculator) Rates(policyTier, residency string) (PolicyConfig, error) {
	key := PolicyKey{PolicyTier: policyTier, Residency: residency}
	cfg, ok := c.policies[key]
	if !ok {
		return PolicyConfig{}, fmt.Errorf("unknown policy tier %s/%s", policyTier, residency)
	}
	return cfg, nil
}

func (c *priceCalculator) ComputeCharge(cfg PolicyConfig, usage WorkloadUsage) ChargeBreakdown {
	components := map[string]float64{
		"cpu":     usage.CPUHours * cfg.Rates.CPUPerHour,
		"storage": usage.StorageGB * cfg.Rates.StoragePerGB,
		"egress":  usage.EgressGB * cfg.Rates.EgressPerGB,
	}

	total := 0.0
	for _, v := range components {
		total += v
	}

	return ChargeBreakdown{
		Components: components,
		Total:      total,
		Currency:   cfg.Budget.Currency,
	}
}

func (c *priceCalculator) Currency() string {
	return c.currency
}
