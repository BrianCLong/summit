package controller

import (
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "os"
    "sort"
)

// PlanDocument represents the serialized planner output consumed by the controller.
type PlanDocument struct {
    Summary struct {
        TotalBaselineCost float64 `json:"total_baseline_cost"`
        TotalPlannedCost  float64 `json:"total_planned_cost"`
        TotalSavingsPct   float64 `json:"total_savings_pct"`
    } `json:"summary"`
    Plans    []EndpointPlan    `json:"plans"`
    Metadata map[string]any    `json:"metadata"`
}

// EndpointPlan is the planner recommendation for a single endpoint.
type EndpointPlan struct {
    Model     string `json:"model"`
    Endpoint  string `json:"endpoint"`
    Autoscaling struct {
        MinReplicas       int     `json:"min_replicas"`
        MaxReplicas       int     `json:"max_replicas"`
        TargetReplicas    int     `json:"target_replicas"`
        TargetUtilization float64 `json:"target_utilization"`
    } `json:"autoscaling"`
    Quantization struct {
        Strategy       string  `json:"strategy"`
        LatencyMS      float64 `json:"latency_ms"`
        Accuracy       float64 `json:"accuracy"`
        QPSCapacity    float64 `json:"qps_capacity"`
        CostPerReplica float64 `json:"cost_per_replica"`
        ExpectedSavings float64 `json:"expected_savings"`
    } `json:"quantization"`
    SLO struct {
        LatencyMS float64 `json:"latency_ms"`
        Accuracy  float64 `json:"accuracy"`
    } `json:"slo"`
    Baseline struct {
        Replicas        int     `json:"replicas"`
        LatencyMS       float64 `json:"latency_ms"`
        Accuracy        float64 `json:"accuracy"`
        CostPerReplica  float64 `json:"cost_per_replica"`
        QPSCapacity     float64 `json:"qps_capacity"`
        TotalCost       float64 `json:"total_cost"`
    } `json:"baseline"`
    PlannedCost       float64 `json:"planned_cost"`
    LatencyHeadroomMS float64 `json:"latency_headroom_ms"`
    AccuracyHeadroom  float64 `json:"accuracy_headroom"`
    SavingsPct        float64 `json:"savings_pct"`
    QuantizationRecipe QuantizationRecipe `json:"quantization_recipe"`
    HPA               HorizontalPodAutoscaler `json:"hpa"`
}

// HorizontalPodAutoscaler is a partial representation of the Kubernetes object.
type HorizontalPodAutoscaler struct {
    APIVersion string          `json:"apiVersion"`
    Kind       string          `json:"kind"`
    Metadata   ObjectMeta      `json:"metadata"`
    Spec       HorizontalSpec  `json:"spec"`
}

// ObjectMeta contains metadata for K8s objects.
type ObjectMeta struct {
    Name      string `json:"name"`
    Namespace string `json:"namespace"`
}

// HorizontalSpec represents the subset of spec we need to render.
type HorizontalSpec struct {
    MinReplicas int             `json:"minReplicas"`
    MaxReplicas int             `json:"maxReplicas"`
    Metrics     []ResourceMetric `json:"metrics"`
    Behavior    HPABehavior      `json:"behavior"`
}

type ResourceMetric struct {
    Type     string         `json:"type"`
    Resource ResourceTarget `json:"resource"`
}

type ResourceTarget struct {
    Name   string          `json:"name"`
    Target UtilizationSpec `json:"target"`
}

type UtilizationSpec struct {
    Type               string `json:"type"`
    AverageUtilization int    `json:"averageUtilization"`
}

type HPABehavior struct {
    ScaleUp   Stabilization `json:"scaleUp"`
    ScaleDown Stabilization `json:"scaleDown"`
}

type Stabilization struct {
    StabilizationWindowSeconds int `json:"stabilizationWindowSeconds"`
}

// QuantizationRecipe mirrors the planner recipe block.
type QuantizationRecipe struct {
    Model             string  `json:"model"`
    Endpoint          string  `json:"endpoint"`
    Strategy          string  `json:"strategy"`
    ExpectedAccuracy  float64 `json:"expected_accuracy"`
    ExpectedLatencyMS float64 `json:"expected_latency_ms"`
    QPSCapacity       float64 `json:"qps_capacity"`
    Notes             string  `json:"notes"`
}

// LoadPlan decodes a planner document from disk.
func LoadPlan(path string) (*PlanDocument, error) {
    file, err := os.Open(path)
    if err != nil {
        return nil, fmt.Errorf("open plan: %w", err)
    }
    defer file.Close()
    return DecodePlan(file)
}

// DecodePlan decodes a planner document from an arbitrary reader.
func DecodePlan(r io.Reader) (*PlanDocument, error) {
    decoder := json.NewDecoder(r)
    decoder.DisallowUnknownFields()
    var doc PlanDocument
    if err := decoder.Decode(&doc); err != nil {
        return nil, fmt.Errorf("decode plan: %w", err)
    }
    if len(doc.Plans) == 0 {
        return nil, errors.New("plan document contained no endpoint plans")
    }
    if doc.Metadata == nil {
        doc.Metadata = map[string]any{}
    }
    if doc.Metadata["namespace"] == nil {
        doc.Metadata["namespace"] = "default"
    }
    sort.Slice(doc.Plans, func(i, j int) bool {
        if doc.Plans[i].Model == doc.Plans[j].Model {
            return doc.Plans[i].Endpoint < doc.Plans[j].Endpoint
        }
        return doc.Plans[i].Model < doc.Plans[j].Model
    })
    return &doc, nil
}

// BuildHPAConfigs renders sanitized HPA objects for the supplied namespace.
func (doc *PlanDocument) BuildHPAConfigs(namespace string) []HorizontalPodAutoscaler {
    results := make([]HorizontalPodAutoscaler, len(doc.Plans))
    for i, plan := range doc.Plans {
        hpa := plan.HPA
        hpa.Metadata.Namespace = namespace
        results[i] = hpa
    }
    sort.Slice(results, func(i, j int) bool {
        if results[i].Metadata.Name == results[j].Metadata.Name {
            return results[i].Metadata.Namespace < results[j].Metadata.Namespace
        }
        return results[i].Metadata.Name < results[j].Metadata.Name
    })
    return results
}

// Recipes extracts the quantization recipes from the plan in a deterministic order.
func (doc *PlanDocument) Recipes() []QuantizationRecipe {
    recipes := make([]QuantizationRecipe, len(doc.Plans))
    for i, plan := range doc.Plans {
        recipes[i] = plan.QuantizationRecipe
    }
    sort.Slice(recipes, func(i, j int) bool {
        if recipes[i].Model == recipes[j].Model {
            return recipes[i].Endpoint < recipes[j].Endpoint
        }
        return recipes[i].Model < recipes[j].Model
    })
    return recipes
}

// Savings reproduces the realized savings totals for deterministic reconciliation.
func (doc *PlanDocument) Savings() (baseline, planned, savingsPct float64) {
    baseline = doc.Summary.TotalBaselineCost
    planned = doc.Summary.TotalPlannedCost
    savingsPct = doc.Summary.TotalSavingsPct
    return
}

