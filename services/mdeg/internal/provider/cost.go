package provider

import (
	"fmt"
	"strings"

	"github.com/summit/mdeg/internal/config"
)

// CostCalculator computes cost estimates for object storage egress.
type CostCalculator interface {
	Cost(provider string, bytes int64) (float64, error)
}

// PricingTable implements CostCalculator using static metadata.
type PricingTable struct {
	pricing map[string]config.ProviderConfig
}

// NewPricingTable constructs a calculator from provider configuration.
func NewPricingTable(providers map[string]config.ProviderConfig) *PricingTable {
	normalized := make(map[string]config.ProviderConfig)
	for key, value := range providers {
		normalized[strings.ToLower(key)] = value
	}
	return &PricingTable{pricing: normalized}
}

// Cost returns the estimated spend in USD for the transfer.
func (p *PricingTable) Cost(provider string, bytes int64) (float64, error) {
	if bytes < 0 {
		return 0, fmt.Errorf("bytes must be non-negative")
	}

	cfg, ok := p.pricing[strings.ToLower(provider)]
	if !ok {
		return 0, fmt.Errorf("unsupported provider %s", provider)
	}

	gib := float64(bytes) / (1024 * 1024 * 1024)
	return cfg.PricePerGiB * gib, nil
}
