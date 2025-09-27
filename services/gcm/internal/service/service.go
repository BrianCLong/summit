package service

import (
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"

	"github.com/summit/gcm/internal/signature"
)

var errBudgetExceeded = errors.New("budget exceeded")

// Service orchestrates pricing, manifests, and reconciliation logic.
type Service struct {
	pricing   *priceCalculator
	ledger    *BudgetLedger
	store     *MemoryStore
	signer    *signature.Signer
	tolerance float64
}

// NewService constructs the domain service.
func NewService(cfg Config, store *MemoryStore, ledger *BudgetLedger, signer *signature.Signer, tolerance float64) *Service {
	if signer == nil {
		signer = signature.NewSigner("")
	}
	if ledger == nil {
		ledger = NewBudgetLedger()
	}
	if store == nil {
		store = NewMemoryStore()
	}
	if tolerance < 0 {
		tolerance = 0
	}
	return &Service{
		pricing:   newPriceCalculator(cfg),
		ledger:    ledger,
		store:     store,
		signer:    signer,
		tolerance: tolerance,
	}
}

// budgetLimit resolves the limit for an account/policy pair.
func budgetLimit(policy PolicyConfig, accountID string) float64 {
	if policy.Budget.AccountLimits != nil {
		if limit, ok := policy.Budget.AccountLimits[accountID]; ok {
			return limit
		}
	}
	return policy.Budget.MonthlyLimit
}

// RecordJob processes a job request and updates the manifest aggregates.
func (s *Service) RecordJob(req JobRequest) (JobChargeResponse, *JobErrorResponse, error) {
	policyCfg, err := s.pricing.Rates(req.PolicyTier, req.Residency)
	if err != nil {
		return JobChargeResponse{}, nil, err
	}

	charges := s.pricing.ComputeCharge(policyCfg, req.Usage)

	budgetKey := BudgetKey{AccountID: req.AccountID, PolicyTier: req.PolicyTier, Residency: req.Residency}
	limit := budgetLimit(policyCfg, req.AccountID)
	entry, err := s.ledger.Consume(budgetKey, limit, policyCfg.Budget.Currency, charges.Total)
	if err != nil {
		required := charges.Total - (entry.Limit - entry.Consumed)
		if required < 0 {
			required = 0
		}
		violation := JobErrorResponse{
			Allowed: false,
			Reason:  "budget_guardrail_triggered",
			Violation: GuardrailViolation{
				AccountID:        req.AccountID,
				PolicyTier:       req.PolicyTier,
				Residency:        req.Residency,
				BudgetLimit:      entry.Limit,
				BudgetConsumed:   entry.Consumed,
				AttemptedCost:    charges.Total,
				Currency:         entry.Currency,
				RequiredHeadroom: required,
				ExplainPath: []string{
					fmt.Sprintf("policy %s/%s budget limit %.2f %s", req.PolicyTier, req.Residency, entry.Limit, entry.Currency),
					fmt.Sprintf("consumed %.2f %s before request", entry.Consumed, entry.Currency),
					fmt.Sprintf("requested %.2f %s which exceeds remaining headroom", charges.Total, entry.Currency),
				},
			},
		}
		return JobChargeResponse{}, &violation, nil
	}

	manifestID := uuid.NewString()
	response := JobChargeResponse{
		JobID:      req.JobID,
		AccountID:  req.AccountID,
		PolicyTier: req.PolicyTier,
		Residency:  req.Residency,
		Usage:      req.Usage,
		Charges:    charges,
		ManifestID: manifestID,
		RecordedAt: time.Now().UTC(),
	}

	s.store.AppendCharge(req.AccountID, ChargeRecord{JobChargeResponse: response})
	s.store.AddToAggregate(req.AccountID, PolicyKey{PolicyTier: req.PolicyTier, Residency: req.Residency}, req.Usage, charges.Components, charges.Total, charges.Currency)

	manifest, err := s.GenerateManifest(req.AccountID)
	if err == nil {
		s.store.SaveManifest(manifest)
	}

	return response, nil, nil
}

// GenerateManifest constructs a signed manifest for the account.
func (s *Service) GenerateManifest(accountID string) (Manifest, error) {
	aggregates := s.store.AggregatesForAccount(accountID)
	if len(aggregates) == 0 {
		return Manifest{}, errors.New("no usage for account")
	}

	lineItems := make([]ManifestLineItem, 0, len(aggregates))
	totalComponents := make(map[string]float64)
	totalCost := 0.0
	currency := "USD"

	keys := make([]PolicyKey, 0, len(aggregates))
	for key := range aggregates {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool {
		if keys[i].PolicyTier == keys[j].PolicyTier {
			return keys[i].Residency < keys[j].Residency
		}
		return keys[i].PolicyTier < keys[j].PolicyTier
	})

	for _, key := range keys {
		agg := aggregates[key]
		currency = agg.Currency
		lineItems = append(lineItems, ManifestLineItem{
			PolicyTier: key.PolicyTier,
			Residency:  key.Residency,
			Usage:      agg.Usage,
			Charges: ChargeBreakdown{
				Components: agg.Components,
				Total:      agg.Total,
				Currency:   agg.Currency,
			},
		})
		for comp, value := range agg.Components {
			totalComponents[comp] += value
		}
		totalCost += agg.Total
	}

	total := ChargeBreakdown{Components: totalComponents, Total: totalCost, Currency: currency}
	manifest := Manifest{
		ManifestID:  uuid.NewString(),
		AccountID:   accountID,
		Currency:    currency,
		GeneratedAt: time.Now().UTC(),
		LineItems:   lineItems,
		Total:       total,
	}

	signature, err := s.signer.Sign(manifest)
	if err != nil {
		return Manifest{}, fmt.Errorf("sign manifest: %w", err)
	}
	manifest.Signature = signature
	return manifest, nil
}

// SubmitProviderUsage stores provider usage data for reconciliation.
func (s *Service) SubmitProviderUsage(report ProviderUsageReport) {
	key := PolicyKey{PolicyTier: report.PolicyTier, Residency: report.Residency}
	s.store.SaveProviderUsage(report.AccountID, key, ProviderAggregate{ProviderUsageReport: report})
}

// Reconcile compares manifests with provider usage numbers.
func (s *Service) Reconcile(accountID string) (ReconciliationSummary, error) {
	manifest, err := s.GenerateManifest(accountID)
	if err != nil {
		cached, ok := s.store.LatestManifest(accountID)
		if !ok {
			return ReconciliationSummary{}, err
		}
		manifest = cached
	}

	providerData := s.store.ProviderUsage(accountID)
	aggregates := s.store.AggregatesForAccount(accountID)

	visited := make(map[PolicyKey]bool)
	deltas := make([]ReconciliationDelta, 0, len(aggregates))
	totalDelta := 0.0

	for key, agg := range aggregates {
		provider := providerData[key]
		visited[key] = true
		delta := agg.Total - provider.TotalCost
		totalDelta += delta

		withinTolerance := withinTolerance(delta, agg.Total, provider.TotalCost, s.tolerance)

		deltas = append(deltas, ReconciliationDelta{
			PolicyTier: key.PolicyTier,
			Residency:  key.Residency,
			Internal: ManifestLineItem{
				PolicyTier: key.PolicyTier,
				Residency:  key.Residency,
				Usage:      agg.Usage,
				Charges: ChargeBreakdown{
					Components: agg.Components,
					Total:      agg.Total,
					Currency:   agg.Currency,
				},
			},
			Provider: ProviderUsageReport{
				AccountID:  accountID,
				PolicyTier: key.PolicyTier,
				Residency:  key.Residency,
				Usage:      provider.Usage,
				TotalCost:  provider.TotalCost,
				Currency:   provider.Currency,
				ReportedAt: provider.ReportedAt,
			},
			CostDelta:       delta,
			WithinTolerance: withinTolerance,
		})
	}

	for key, provider := range providerData {
		if visited[key] {
			continue
		}
		delta := -provider.TotalCost
		totalDelta += delta
		deltas = append(deltas, ReconciliationDelta{
			PolicyTier: key.PolicyTier,
			Residency:  key.Residency,
			Internal: ManifestLineItem{
				PolicyTier: key.PolicyTier,
				Residency:  key.Residency,
				Charges:    ChargeBreakdown{Components: map[string]float64{}, Total: 0, Currency: provider.Currency},
			},
			Provider:        provider.ProviderUsageReport,
			CostDelta:       delta,
			WithinTolerance: withinTolerance(delta, 0, provider.TotalCost, s.tolerance),
		})
	}

	sort.Slice(deltas, func(i, j int) bool {
		if deltas[i].PolicyTier == deltas[j].PolicyTier {
			return deltas[i].Residency < deltas[j].Residency
		}
		return deltas[i].PolicyTier < deltas[j].PolicyTier
	})

	summary := ReconciliationSummary{
		AccountID:       accountID,
		Currency:        manifest.Currency,
		Tolerance:       s.tolerance,
		Deltas:          deltas,
		TotalDelta:      totalDelta,
		WithinTolerance: withinTolerance(totalDelta, manifest.Total.Total, totalProviderTotal(providerData), s.tolerance),
		GeneratedAt:     time.Now().UTC(),
	}

	return summary, nil
}

func withinTolerance(delta, internal, provider, tolerance float64) bool {
	base := internal
	if provider > base {
		base = provider
	}
	if base == 0 {
		return true
	}
	if tolerance <= 0 {
		return delta == 0
	}
	if delta < 0 {
		delta = -delta
	}
	return delta <= base*tolerance
}

func totalProviderTotal(provider map[PolicyKey]ProviderAggregate) float64 {
	total := 0.0
	for _, p := range provider {
		total += p.TotalCost
	}
	return total
}
