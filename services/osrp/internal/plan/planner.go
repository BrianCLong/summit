package plan

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
)

// Planner applies guardrails and produces signed rollout manifests.
type Planner struct {
	config  PlannerConfig
	stopper BayesianStopper
	signer  *ManifestSigner
}

// NewPlanner constructs a planner with Jeffreys prior to keep Bayesian stopping neutral.
func NewPlanner(config PlannerConfig, signer *ManifestSigner) (*Planner, error) {
	if signer == nil {
		return nil, errors.New("manifest signer is required")
	}
	stopper := BayesianStopper{PriorAlpha: 0.5, PriorBeta: 0.5}
	if err := stopper.Validate(); err != nil {
		return nil, err
	}
	if config.BlockRateConfidence <= 0 || config.BlockRateConfidence > 1 {
		return nil, fmt.Errorf("block rate confidence must be within (0,1]")
	}
	if config.CanaryConfidence <= 0 || config.CanaryConfidence > 1 {
		return nil, fmt.Errorf("canary confidence must be within (0,1]")
	}
	return &Planner{config: config, stopper: stopper, signer: signer}, nil
}

// Plan evaluates fixture data to produce a deterministic rollout manifest.
func (p *Planner) Plan(fixture RolloutFixture) (*PlanResult, error) {
	if p == nil {
		return nil, errors.New("planner is not initialised")
	}
	manifest := RolloutManifest{
		Version:     p.config.ManifestVersion,
		Release:     fixture.Release,
		PlannedAt:   fixture.PlannedAt.UTC().Format(time.RFC3339),
		GeneratedAt: fixture.PlannedAt.UTC().Format(time.RFC3339),
		Stages:      []ManifestStage{},
		Guardrails:  []GuardrailResult{},
		AutoRevert:  AutoRevertConfig{Enabled: false, Trigger: "none"},
	}
	var breaches []GuardrailBreach
	policyBreach := false
	productBreach := false
	for _, stage := range fixture.Stages {
		obs := deriveObservations(stage.Metrics)
		stageStatus := "approved"
		stageBreaches := make([]GuardrailBreach, 0)

		// Block rate guardrail (policy).
		probBlock := p.stopper.ProbabilityExceeds(stage.Metrics.Blocked, stage.Metrics.TotalRequests, p.config.BlockRateThreshold)
		blockBreach := obs.BlockRate > p.config.BlockRateThreshold || probBlock >= p.config.BlockRateConfidence
		manifest.Guardrails = append(manifest.Guardrails, GuardrailResult{
			Stage:       stage.Name,
			Guardrail:   "block-rate",
			Category:    "policy",
			Status:      guardrailStatus(blockBreach),
			Value:       obs.BlockRate,
			Threshold:   p.config.BlockRateThreshold,
			Probability: probBlock,
		})
		if blockBreach {
			stageBreaches = append(stageBreaches, GuardrailBreach{
				Stage:       stage.Name,
				Guardrail:   "block-rate",
				Category:    "policy",
				Actual:      obs.BlockRate,
				Threshold:   p.config.BlockRateThreshold,
				Probability: probBlock,
				Message:     fmt.Sprintf("block rate %.4f breached policy threshold %.4f", obs.BlockRate, p.config.BlockRateThreshold),
			})
			policyBreach = true
		}

		// Canary catch rate guardrail (policy).
		probCatchBelow := p.stopper.ProbabilityBelow(stage.Metrics.CanaryCaught, stage.Metrics.CanaryMissed, p.config.MinCanaryCatchRate)
		catchBreach := obs.CanaryCatchRate < p.config.MinCanaryCatchRate || probCatchBelow >= p.config.CanaryConfidence
		manifest.Guardrails = append(manifest.Guardrails, GuardrailResult{
			Stage:       stage.Name,
			Guardrail:   "canary-catch-rate",
			Category:    "policy",
			Status:      guardrailStatus(catchBreach),
			Value:       obs.CanaryCatchRate,
			Threshold:   p.config.MinCanaryCatchRate,
			Probability: probCatchBelow,
		})
		if catchBreach {
			stageBreaches = append(stageBreaches, GuardrailBreach{
				Stage:       stage.Name,
				Guardrail:   "canary-catch-rate",
				Category:    "policy",
				Actual:      obs.CanaryCatchRate,
				Threshold:   p.config.MinCanaryCatchRate,
				Probability: probCatchBelow,
				Message:     fmt.Sprintf("canary catch rate %.4f below policy minimum %.4f", obs.CanaryCatchRate, p.config.MinCanaryCatchRate),
			})
			policyBreach = true
		}

		// Latency SLO guardrail (product).
		latencyBreach := obs.LatencyP95MS > p.config.MaxLatencyP95
		manifest.Guardrails = append(manifest.Guardrails, GuardrailResult{
			Stage:     stage.Name,
			Guardrail: "latency-p95",
			Category:  "product",
			Status:    guardrailStatus(latencyBreach),
			Value:     obs.LatencyP95MS,
			Threshold: p.config.MaxLatencyP95,
		})
		if latencyBreach {
			stageBreaches = append(stageBreaches, GuardrailBreach{
				Stage:     stage.Name,
				Guardrail: "latency-p95",
				Category:  "product",
				Actual:    obs.LatencyP95MS,
				Threshold: p.config.MaxLatencyP95,
				Message:   fmt.Sprintf("latency p95 %.2fms exceeds SLO %.2fms", obs.LatencyP95MS, p.config.MaxLatencyP95),
			})
			productBreach = true
		}

		// Business KPI guardrail (product).
		kpiBreach := obs.BusinessKPI < p.config.MinBusinessKPI
		manifest.Guardrails = append(manifest.Guardrails, GuardrailResult{
			Stage:     stage.Name,
			Guardrail: "business-kpi",
			Category:  "product",
			Status:    guardrailStatus(kpiBreach),
			Value:     obs.BusinessKPI,
			Threshold: p.config.MinBusinessKPI,
		})
		if kpiBreach {
			stageBreaches = append(stageBreaches, GuardrailBreach{
				Stage:     stage.Name,
				Guardrail: "business-kpi",
				Category:  "product",
				Actual:    obs.BusinessKPI,
				Threshold: p.config.MinBusinessKPI,
				Message:   fmt.Sprintf("business KPI %.4f below guardrail %.4f", obs.BusinessKPI, p.config.MinBusinessKPI),
			})
			productBreach = true
		}

		if len(stageBreaches) > 0 {
			stageStatus = "halted"
			breaches = append(breaches, stageBreaches...)
		}

		manifest.Stages = append(manifest.Stages, ManifestStage{
			Name:           stage.Name,
			TrafficPercent: roundTwoDecimal(stage.TrafficPercent),
			Status:         stageStatus,
			Observations:   obs,
		})

		if len(stageBreaches) > 0 {
			break
		}
	}

	if len(breaches) > 0 {
		manifest.AutoRevert.Enabled = true
		manifest.AutoRevert.Trigger = autoRevertTrigger(policyBreach, productBreach)
		manifest.AutoRevert.Reason = joinMessages(breaches)
	}

	payload, err := payloadForSigning(manifest)
	if err != nil {
		return nil, err
	}
	signature, err := p.signer.Sign(payload)
	if err != nil {
		return nil, err
	}
	manifest.Signature = signature

	return &PlanResult{Manifest: manifest, Breaches: breaches}, nil
}

func deriveObservations(metrics StageMetrics) StageObservations {
	var blockRate float64
	if metrics.TotalRequests > 0 {
		blockRate = float64(metrics.Blocked) / float64(metrics.TotalRequests)
	}
	totalSignals := metrics.CanaryCaught + metrics.CanaryMissed
	var catchRate float64
	if totalSignals > 0 {
		catchRate = float64(metrics.CanaryCaught) / float64(totalSignals)
	}
	return StageObservations{
		BlockRate:       roundFourDecimal(blockRate),
		CanaryCatchRate: roundFourDecimal(catchRate),
		LatencyP95MS:    roundTwoDecimal(metrics.LatencyP95MS),
		BusinessKPI:     roundFourDecimal(metrics.BusinessKPI),
	}
}

func roundTwoDecimal(v float64) float64 {
	return math.Round(v*100) / 100
}

func roundFourDecimal(v float64) float64 {
	return math.Round(v*10000) / 10000
}

func guardrailStatus(breach bool) string {
	if breach {
		return "breach"
	}
	return "pass"
}

func joinMessages(breaches []GuardrailBreach) string {
	msgs := make([]string, len(breaches))
	for i, b := range breaches {
		msgs[i] = b.Message
	}
	return strings.Join(msgs, "; ")
}

func autoRevertTrigger(policy, product bool) string {
	switch {
	case policy && product:
		return "policy-and-product-violation"
	case policy:
		return "policy-violation"
	case product:
		return "product-violation"
	default:
		return "none"
	}
}

func payloadForSigning(manifest RolloutManifest) ([]byte, error) {
	clone := manifest
	clone.Signature = ""
	payload, err := json.Marshal(clone)
	if err != nil {
		return nil, fmt.Errorf("marshal manifest: %w", err)
	}
	return payload, nil
}
