package detectors

import (
	"regexp"
	"time"

	"github.com/summit/sss/pkg/models"
)

// RegexDetector matches credentials and PII via curated regular expressions.
type RegexDetector struct {
	Rules map[string]*regexp.Regexp
}

// Name implements Detector.
func (r RegexDetector) Name() string { return "regex" }

// Detect implements Detector.
func (r RegexDetector) Detect(path string, content []byte) ([]models.Finding, error) {
	if len(r.Rules) == 0 {
		r.Rules = defaultRegexRules()
	}
	var findings []models.Finding
	for ruleID, rx := range r.Rules {
		indices := rx.FindAllIndex(content, -1)
		for _, idx := range indices {
			match := content[idx[0]:idx[1]]
			line, col := computeLineCol(content, idx[0])
			findings = append(findings, models.Finding{
				ID:          models.HashID(path, ruleID, string(match)),
				Detector:    r.Name(),
				RuleID:      ruleID,
				Description: "Pattern match for sensitive credential or PII",
				FilePath:    path,
				Line:        line,
				Column:      col,
				SecretType:  ruleID,
				Match:       string(match),
				Context:     contextWindow(content, idx[0], idx[1], 32),
				Severity:    models.SeverityCritical,
				Confidence:  0.95,
				ReportedAt:  time.Now().UTC(),
			})
		}
	}
	return findings, nil
}

func defaultRegexRules() map[string]*regexp.Regexp {
	return map[string]*regexp.Regexp{
		"aws-access-key": regexp.MustCompile(`(?i)AKIA[0-9A-Z]{16}`),
		"aws-secret-key": regexp.MustCompile(`(?i)aws(.{0,20})?(secret|access).{0,4}(["']?[0-9a-zA-Z\/+]{40})`),
		"github-token":   regexp.MustCompile(`ghp_[0-9a-zA-Z]{36}`),
		"slack-token":    regexp.MustCompile(`xox[baprs]-[0-9a-zA-Z-]{10,48}`),
		"google-api-key": regexp.MustCompile(`AIza[0-9A-Za-z\-_]{35}`),
		"azure-sas":      regexp.MustCompile(`se=\d{4}-\d{2}-\d{2}.*sig=[0-9A-Za-z%]{30,}`),
		"heroku-api-key": regexp.MustCompile(`(?i)heroku(.{0,20})?[:=]["']?[0-9a-f]{32}`),
		"private-key":    regexp.MustCompile(`-----BEGIN (EC|RSA|DSA)? ?PRIVATE KEY-----`),
		"email":          regexp.MustCompile(`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`),
		"us-ssn":         regexp.MustCompile(`\b\d{3}-\d{2}-\d{4}\b`),
		"stripe-key":     regexp.MustCompile(`sk_live_[0-9a-zA-Z]{24}`),
		"twilio-key":     regexp.MustCompile(`SK[0-9a-fA-F]{32}`),
		"pg-connection":  regexp.MustCompile(`postgres://[^\s]+`),
	}
}
