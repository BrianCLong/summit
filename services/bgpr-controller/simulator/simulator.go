package simulator

import "github.com/summit/bgpr/controller"

type Simulator struct {
	ctrl *controller.Controller
}

func New(ctrl *controller.Controller) *Simulator {
	return &Simulator{ctrl: ctrl}
}

type SimulationResult struct {
	DryRun   controller.DryRunResult `json:"dryRun"`
	Breaches []string                `json:"breaches"`
}

func (s *Simulator) Execute(manifest controller.RolloutManifest) (SimulationResult, error) {
	dryRun, err := s.ctrl.DryRun(manifest)
	if err != nil {
		return SimulationResult{}, err
	}
	guardrails := controller.GuardrailThresholds{
		MinBlockRate: manifest.Thresholds.MinBlockRate,
		MaxLatencyMs: manifest.Thresholds.MaxLatencyMs,
		MaxFnDelta:   manifest.Thresholds.MaxFnDelta,
	}
	breaches := controller.EvaluateBreachesForSimulator(dryRun.Metrics, guardrails)
	return SimulationResult{DryRun: dryRun, Breaches: breaches}, nil
}
