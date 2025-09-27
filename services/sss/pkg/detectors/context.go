package detectors

import (
	"bytes"
	"regexp"
	"strings"
	"time"

	"github.com/summit/sss/pkg/models"
)

// ContextDetector searches for suspicious keywords followed by assignments.
type ContextDetector struct {
	Keywords []string
}

// Name implements Detector.
func (c ContextDetector) Name() string { return "context" }

// Detect implements Detector.
func (c ContextDetector) Detect(path string, content []byte) ([]models.Finding, error) {
	keywords := c.Keywords
	if len(keywords) == 0 {
		keywords = []string{
			"password", "secret", "token", "api_key", "apikey",
			"credential", "auth", "private", "key", "ssn",
		}
	}

	joined := strings.ToLower(string(content))
	var findings []models.Finding
	for _, keyword := range keywords {
		idx := 0
		lowerKeyword := strings.ToLower(keyword)
		for {
			pos := strings.Index(joined[idx:], lowerKeyword)
			if pos == -1 {
				break
			}
			absolute := idx + pos
			line, col := computeLineCol(content, absolute)
			snippet := contextWindow(content, absolute, absolute+len(keyword), 48)
			value := extractAssignmentValue(content[absolute:])
			if value == "" {
				idx = absolute + len(keyword)
				continue
			}
			findings = append(findings, models.Finding{
				ID:          models.HashID(path, keyword, value),
				Detector:    c.Name(),
				RuleID:      "context-keyword",
				Description: "Sensitive keyword assignment detected",
				FilePath:    path,
				Line:        line,
				Column:      col,
				SecretType:  keyword,
				Match:       value,
				Context:     snippet,
				Severity:    models.SeverityMedium,
				Confidence:  0.7,
				ReportedAt:  time.Now().UTC(),
			})
			idx = absolute + len(keyword)
		}
	}
	return dedupeFindings(findings), nil
}

var assignPattern = regexp.MustCompile(`(?s)\A[^\S\n]*[:=\-\>\s]+(["']?)([^"'\s]{4,})(["']?)`)

func extractAssignmentValue(b []byte) string {
	trimmed := bytes.TrimSpace(b)
	matches := assignPattern.FindSubmatch(trimmed)
	if len(matches) < 3 {
		return ""
	}
	value := string(matches[2])
	if len(value) < 4 {
		return ""
	}
	return value
}

func dedupeFindings(findings []models.Finding) []models.Finding {
	seen := make(map[string]bool)
	var result []models.Finding
	for _, f := range findings {
		key := f.FilePath + "::" + f.Match + "::" + f.RuleID
		if seen[key] {
			continue
		}
		seen[key] = true
		result = append(result, f)
	}
	return result
}
