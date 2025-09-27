package pbs

import (
	"fmt"
	"strings"
)

// BuildRecommendation renders a diff-friendly rollout recommendation.
func BuildRecommendation(report BacktestReport) string {
	summary := report.Summary
	verdict := "hold"
	rationale := []string{}

	blockDelta := summary.BlockRateDelta
	latencyDelta := summary.AverageLatencyDeltaMS
	canary := summary.FalseNegativeCanaryCatchers

	if canary > 0 && blockDelta <= 0.02 {
		verdict = "promote"
		rationale = append(rationale, fmt.Sprintf("caught %d latent canaries", canary))
		if blockDelta != 0 {
			rationale = append(rationale, fmt.Sprintf("block-rate delta %+0.2f%%", blockDelta*100))
		}
	} else if blockDelta > 0.05 {
		verdict = "hold"
		rationale = append(rationale, fmt.Sprintf("block-rate delta %+0.2f%% exceeds limit", blockDelta*100))
	} else if latencyDelta > 15 {
		verdict = "hold"
		rationale = append(rationale, fmt.Sprintf("average latency delta %+0.2fms", latencyDelta))
	} else {
		if blockDelta >= -0.01 {
			verdict = "promote"
		} else {
			verdict = "observe"
		}
		rationale = append(rationale, fmt.Sprintf("block-rate delta %+0.2f%%", blockDelta*100))
		rationale = append(rationale, fmt.Sprintf("latency delta %+0.2fms", latencyDelta))
	}

	builder := &strings.Builder{}
	builder.WriteString("# PBS Rollout Recommendation\n")
	builder.WriteString(fmt.Sprintf("verdict: %s\n", verdict))
	builder.WriteString(fmt.Sprintf("policy_version: %s\n", report.Policy.Version))
	builder.WriteString(fmt.Sprintf("run_id: %s\n", report.DeterministicRunID))
	builder.WriteString("rationale:\n")
	for _, line := range rationale {
		builder.WriteString(fmt.Sprintf("  - %s\n", line))
	}
	builder.WriteString("metrics:\n")
	builder.WriteString(fmt.Sprintf("  block_rate_delta: %+0.4f\n", blockDelta))
	builder.WriteString(fmt.Sprintf("  latency_delta_ms: %+0.2f\n", latencyDelta))
	builder.WriteString(fmt.Sprintf("  canary_catches: %d\n", canary))
	return builder.String()
}
