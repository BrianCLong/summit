package core

import (
	"math"
	"sort"
)

// HoltWintersState maintains state for triple exponential smoothing.
type HoltWintersState struct {
	alpha        float64
	beta         float64
	gamma        float64
	seasonLength int
	level        float64
	trend        float64
	season       []float64
	initialized  bool
	index        int
	observations int
	residuals    []float64
	residualCap  int
}

func NewHoltWintersState(alpha, beta, gamma float64, seasonLength int, residualCap int) *HoltWintersState {
	if seasonLength <= 0 {
		seasonLength = 24
	}
	if residualCap <= 0 {
		residualCap = seasonLength * 6
	}
	return &HoltWintersState{
		alpha:        alpha,
		beta:         beta,
		gamma:        gamma,
		seasonLength: seasonLength,
		season:       make([]float64, seasonLength),
		residualCap:  residualCap,
	}
}

// Forecast returns the expected next value from the model.
func (h *HoltWintersState) Forecast() (float64, bool) {
	if !h.initialized || h.observations < h.seasonLength*2 {
		return 0, false
	}
	idx := h.index % h.seasonLength
	return h.level + h.trend + h.season[idx], true
}

// Update ingests the next value and refreshes the smoothing state.
func (h *HoltWintersState) Update(value float64) {
	if !h.initialized {
		for i := range h.season {
			h.season[i] = value
		}
		h.level = value
		h.trend = 0
		h.initialized = true
		h.observations = 1
		h.index = 1 % h.seasonLength
		return
	}

	idx := h.index % h.seasonLength
	prevLevel := h.level
	seasonal := h.season[idx]
	h.level = h.alpha*(value-seasonal) + (1-h.alpha)*(h.level+h.trend)
	h.trend = h.beta*(h.level-prevLevel) + (1-h.beta)*h.trend
	h.season[idx] = h.gamma*(value-h.level) + (1-h.gamma)*seasonal
	h.index = (h.index + 1) % h.seasonLength
	h.observations++
}

// RecordResidual captures residual magnitudes for robust dispersion.
func (h *HoltWintersState) RecordResidual(residual float64) {
	if residual < 0 {
		residual = -residual
	}
	h.residuals = append(h.residuals, residual)
	if len(h.residuals) > h.residualCap {
		copy(h.residuals, h.residuals[len(h.residuals)-h.residualCap:])
		h.residuals = h.residuals[:h.residualCap]
	}
}

// MAD returns the median absolute deviation of residual magnitudes.
func (h *HoltWintersState) MAD() float64 {
	if len(h.residuals) == 0 {
		return 0
	}
	values := make([]float64, len(h.residuals))
	copy(values, h.residuals)
	sort.Float64s(values)
	med := median(values)
	deviations := make([]float64, len(values))
	for i, v := range values {
		deviations[i] = math.Abs(v - med)
	}
	sort.Float64s(deviations)
	devMed := median(deviations)
	if devMed == 0 {
		return 0
	}
	return devMed
}

// RobustZState maintains a rolling window for robust z-score detection.
type RobustZState struct {
	window  []float64
	maxSize int
}

func NewRobustZState(maxSize int) *RobustZState {
	if maxSize <= 0 {
		maxSize = 168
	}
	return &RobustZState{maxSize: maxSize}
}

func (r *RobustZState) Score(value float64) (float64, bool) {
	if len(r.window) < 5 {
		return 0, false
	}
	values := make([]float64, len(r.window))
	copy(values, r.window)
	sort.Float64s(values)
	med := median(values)
	deviations := make([]float64, len(values))
	for i, v := range values {
		deviations[i] = math.Abs(v - med)
	}
	sort.Float64s(deviations)
	mad := median(deviations)
	if mad == 0 {
		return 0, false
	}
	score := 0.6745 * (value - med) / mad
	return score, true
}

func (r *RobustZState) Add(value float64) {
	r.window = append(r.window, value)
	if len(r.window) > r.maxSize {
		copy(r.window, r.window[len(r.window)-r.maxSize:])
		r.window = r.window[:r.maxSize]
	}
}

func median(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	n := len(values)
	mid := n / 2
	if n%2 == 0 {
		return (values[mid-1] + values[mid]) / 2
	}
	return values[mid]
}
