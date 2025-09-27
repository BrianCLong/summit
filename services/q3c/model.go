package main

import (
	"errors"
	"fmt"
)

// ResourceUsage captures the calibrated measurements that drive pricing and carbon intensity.
type ResourceUsage struct {
	CPUSeconds float64 `json:"cpuSeconds"`
	RAMGbHours float64 `json:"ramGbHours"`
	IOGb       float64 `json:"ioGb"`
	EgressGb   float64 `json:"egressGb"`
}

// CostRates encodes dollar denominated calibrations for each resource dimension.
type CostRates struct {
	CPUPerSecond float64
	RAMPerGbHour float64
	IOPerGb      float64
	EgressPerGb  float64
}

// EnergyCoefficients encode the energy draw attributable to each resource dimension.
type EnergyCoefficients struct {
	CPUWatt       float64
	RAMWattPerGb  float64
	IOWhPerGb     float64
	EgressWhPerGb float64
}

// CostBreakdown itemises the cost contribution by resource type.
type CostBreakdown struct {
	CPUCostUSD    float64 `json:"cpuUsd"`
	RAMCostUSD    float64 `json:"ramUsd"`
	IOCostUSD     float64 `json:"ioUsd"`
	EgressCostUSD float64 `json:"egressUsd"`
}

// DetailedCost is returned for both projected and actualised usage.
type DetailedCost struct {
	CostUSD   float64       `json:"costUsd"`
	CarbonKg  float64       `json:"carbonKg"`
	EnergyKWh float64       `json:"energyKwh"`
	Breakdown CostBreakdown `json:"breakdown"`
}

// Estimate extends DetailedCost with attribution metadata from the model.
type Estimate struct {
	DetailedCost
	ModelVersion string  `json:"modelVersion"`
	ErrorMargin  float64 `json:"errorMargin"`
}

// Delta summarises the deviation between projected and actual resource impact.
type Delta struct {
	CostUSD  float64 `json:"costUsd"`
	CarbonKg float64 `json:"carbonKg"`
}

// ActualReport contains realised usage reconciled against the projected values.
type ActualReport struct {
	DetailedCost
	Usage ResourceUsage `json:"usage"`
	Delta Delta         `json:"delta"`
}

// ResourceModel projects cost and carbon output using calibrated coefficients.
type ResourceModel struct {
	costRates       CostRates
	energy          EnergyCoefficients
	carbonIntensity map[string]float64
	errorMargin     float64
	modelVersion    string
}

// NewDefaultModel returns the calibrated model used for projections and reconciliation.
func NewDefaultModel() *ResourceModel {
	return &ResourceModel{
		costRates: CostRates{
			CPUPerSecond: 0.000031,
			RAMPerGbHour: 0.0042,
			IOPerGb:      0.11,
			EgressPerGb:  0.05,
		},
		energy: EnergyCoefficients{
			CPUWatt:       45,
			RAMWattPerGb:  2.8,
			IOWhPerGb:     0.42,
			EgressWhPerGb: 1.15,
		},
		carbonIntensity: map[string]float64{
			"us-east-1":      0.379,
			"us-west-2":      0.298,
			"us-central-1":   0.427,
			"eu-west-1":      0.271,
			"eu-central-1":   0.401,
			"ap-south-1":     0.72,
			"ap-northeast-1": 0.465,
		},
		errorMargin:  0.05,
		modelVersion: "2024.10-calibrated",
	}
}

// Estimate generates a projected cost and carbon impact for the supplied usage profile.
func (m *ResourceModel) Estimate(region string, usage ResourceUsage) (Estimate, error) {
	if err := m.validate(region, usage); err != nil {
		return Estimate{}, err
	}

	detail, err := m.detailedCost(region, usage)
	if err != nil {
		return Estimate{}, err
	}

	return Estimate{
		DetailedCost: detail,
		ModelVersion: m.modelVersion,
		ErrorMargin:  m.errorMargin,
	}, nil
}

// Actualise computes the realised impact for usage once a job completes.
func (m *ResourceModel) Actualise(region string, usage ResourceUsage, projected Estimate) (ActualReport, error) {
	if err := m.validate(region, usage); err != nil {
		return ActualReport{}, err
	}

	detail, err := m.detailedCost(region, usage)
	if err != nil {
		return ActualReport{}, err
	}

	delta := Delta{
		CostUSD:  detail.CostUSD - projected.CostUSD,
		CarbonKg: detail.CarbonKg - projected.CarbonKg,
	}

	return ActualReport{
		DetailedCost: detail,
		Usage:        usage,
		Delta:        delta,
	}, nil
}

func (m *ResourceModel) validate(region string, usage ResourceUsage) error {
	if region == "" {
		return errors.New("region is required")
	}
	if _, ok := m.carbonIntensity[region]; !ok {
		return fmt.Errorf("region %s not supported", region)
	}
	if usage.CPUSeconds < 0 || usage.RAMGbHours < 0 || usage.IOGb < 0 || usage.EgressGb < 0 {
		return errors.New("usage metrics must be non-negative")
	}
	return nil
}

func (m *ResourceModel) detailedCost(region string, usage ResourceUsage) (DetailedCost, error) {
	intensity, ok := m.carbonIntensity[region]
	if !ok {
		return DetailedCost{}, fmt.Errorf("region %s not supported", region)
	}

	breakdown := CostBreakdown{
		CPUCostUSD:    usage.CPUSeconds * m.costRates.CPUPerSecond,
		RAMCostUSD:    usage.RAMGbHours * m.costRates.RAMPerGbHour,
		IOCostUSD:     usage.IOGb * m.costRates.IOPerGb,
		EgressCostUSD: usage.EgressGb * m.costRates.EgressPerGb,
	}
	totalCost := breakdown.CPUCostUSD + breakdown.RAMCostUSD + breakdown.IOCostUSD + breakdown.EgressCostUSD

	cpuEnergyWh := (usage.CPUSeconds / 3600.0) * m.energy.CPUWatt
	ramEnergyWh := usage.RAMGbHours * m.energy.RAMWattPerGb
	ioEnergyWh := usage.IOGb * m.energy.IOWhPerGb
	egressEnergyWh := usage.EgressGb * m.energy.EgressWhPerGb
	totalEnergyKWh := (cpuEnergyWh + ramEnergyWh + ioEnergyWh + egressEnergyWh) / 1000.0
	carbon := totalEnergyKWh * intensity

	return DetailedCost{
		CostUSD:   totalCost,
		CarbonKg:  carbon,
		EnergyKWh: totalEnergyKWh,
		Breakdown: breakdown,
	}, nil
}

// CarbonIntensity exposes the current mapping for use by API responses and tests.
func (m *ResourceModel) CarbonIntensity(region string) (float64, bool) {
	value, ok := m.carbonIntensity[region]
	return value, ok
}
