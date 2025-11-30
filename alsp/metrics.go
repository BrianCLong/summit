package alsp

import (
	"sync"
	"time"
)

// PerformanceMetrics aggregates compression statistics and latency samples.
type PerformanceMetrics struct {
	mu sync.Mutex

	rawBytes        int
	compressedBytes int

	rangeSamples []time.Duration
	eventSamples []time.Duration
	gapSamples   []time.Duration
}

func (m *PerformanceMetrics) recordRaw(size int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.rawBytes += size
}

func (m *PerformanceMetrics) recordCompressed(size int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.compressedBytes += size
}

func (m *PerformanceMetrics) recordRangeLatency(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.rangeSamples = append(m.rangeSamples, d)
}

func (m *PerformanceMetrics) recordEventLatency(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.eventSamples = append(m.eventSamples, d)
}

func (m *PerformanceMetrics) recordGapLatency(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.gapSamples = append(m.gapSamples, d)
}

// Report summarises the collected metrics. When there are no samples the report
// defaults to zeroed values to keep consumers deterministic.
type Report struct {
	CompressionRatio float64       `json:"compressionRatio"`
	AvgRangeLatency  time.Duration `json:"avgRangeLatency"`
	AvgEventLatency  time.Duration `json:"avgEventLatency"`
	AvgGapLatency    time.Duration `json:"avgGapLatency"`
}

func (m *PerformanceMetrics) Report() Report {
	m.mu.Lock()
	defer m.mu.Unlock()
	report := Report{}
	if m.compressedBytes > 0 {
		report.CompressionRatio = float64(m.rawBytes) / float64(m.compressedBytes)
	}
	report.AvgRangeLatency = averageDuration(m.rangeSamples)
	report.AvgEventLatency = averageDuration(m.eventSamples)
	report.AvgGapLatency = averageDuration(m.gapSamples)
	return report
}

func averageDuration(samples []time.Duration) time.Duration {
	if len(samples) == 0 {
		return 0
	}
	var total time.Duration
	for _, sample := range samples {
		total += sample
	}
	return total / time.Duration(len(samples))
}
