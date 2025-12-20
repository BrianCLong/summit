package detectors

import (
	"math"
	"regexp"
	"time"

	"github.com/summit/sss/pkg/models"
)

var entropyToken = regexp.MustCompile(`(?i)[A-Za-z0-9+/=]{20,}`)

// EntropyDetector looks for high-entropy strings that likely contain secrets.
type EntropyDetector struct {
	Threshold float64
	MinLength int
}

// Name implements Detector.
func (e EntropyDetector) Name() string { return "entropy" }

// Detect implements Detector.
func (e EntropyDetector) Detect(path string, content []byte) ([]models.Finding, error) {
	threshold := e.Threshold
	if threshold == 0 {
		threshold = 4.0
	}
	minLen := e.MinLength
	if minLen == 0 {
		minLen = 20
	}

	matches := entropyToken.FindAllIndex(content, -1)
	var findings []models.Finding
	for _, match := range matches {
		span := content[match[0]:match[1]]
		if len(span) < minLen {
			continue
		}
		entropy := shannonEntropy(span)
		if entropy < threshold {
			continue
		}
		line, col := computeLineCol(content, match[0])
		findings = append(findings, models.Finding{
			ID:          models.HashID(path, e.Name(), string(span)),
			Detector:    e.Name(),
			RuleID:      "entropy-high",
			Description: "High entropy secret-like token detected",
			FilePath:    path,
			Line:        line,
			Column:      col,
			SecretType:  "potential-secret",
			Match:       string(span),
			Context:     contextWindow(content, match[0], match[1], 32),
			Severity:    models.SeverityHigh,
			Confidence:  entropy / 8.0,
			ReportedAt:  time.Now().UTC(),
		})
	}
	return findings, nil
}

func shannonEntropy(data []byte) float64 {
	freq := make(map[byte]int)
	for _, b := range data {
		freq[b]++
	}

	var entropy float64
	length := float64(len(data))
	for _, count := range freq {
		p := float64(count) / length
		entropy -= p * math.Log2(p)
	}
	return entropy
}
