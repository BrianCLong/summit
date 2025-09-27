package core

import "time"

// Event represents a single prediction outcome pair that feeds the fairness metrics engine.
type Event struct {
	PredictionID   string            `json:"prediction_id"`
	Timestamp      time.Time         `json:"timestamp"`
	Score          float64           `json:"score"`
	PredictedLabel bool              `json:"predicted_label"`
	ActualLabel    bool              `json:"actual_label"`
	Group          string            `json:"group"`
	Attributes     map[string]string `json:"attributes"`
}

// GroupMetrics summarises performance statistics for a protected group within the active window.
type GroupMetrics struct {
	Group        string  `json:"group"`
	Support      int     `json:"support"`
	TP           int     `json:"true_positives"`
	FP           int     `json:"false_positives"`
	TN           int     `json:"true_negatives"`
	FN           int     `json:"false_negatives"`
	TPR          float64 `json:"tpr"`
	FPR          float64 `json:"fpr"`
	PositiveRate float64 `json:"positive_rate"`
	TopKRate     float64 `json:"top_k_rate"`
}

// MetricSnapshot captures the fairness deltas computed across groups for the current window.
type MetricSnapshot struct {
	WindowStart     time.Time      `json:"window_start"`
	WindowEnd       time.Time      `json:"window_end"`
	GroupMetrics    []GroupMetrics `json:"group_metrics"`
	TPRGap          float64        `json:"tpr_gap"`
	FPRGap          float64        `json:"fpr_gap"`
	DemographicDiff float64        `json:"demographic_parity_diff"`
	EqOppAtKDiff    float64        `json:"eq_opp_at_k_diff"`
}

// Alert represents a threshold breach on one of the fairness metrics.
type Alert struct {
	Metric      string            `json:"metric"`
	Value       float64           `json:"value"`
	Threshold   float64           `json:"threshold"`
	WindowEnd   time.Time         `json:"window_end"`
	Groups      []string          `json:"groups"`
	Slices      []string          `json:"slices"`
	Explanation map[string]string `json:"explanation"`
}

// Thresholds defines the fairness alert limits.
type Thresholds struct {
	TPRGap       float64
	FPRGap       float64
	Demographic  float64
	EqOppAtKDiff float64
}

// ReplayResult captures deterministic metrics/alerts emitted during a replay run.
type ReplayResult struct {
	Metrics []MetricSnapshot `json:"metrics"`
	Alerts  []Alert          `json:"alerts"`
}
