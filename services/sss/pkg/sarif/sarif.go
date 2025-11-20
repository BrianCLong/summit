package sarif

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"

	"github.com/summit/sss/pkg/models"
)

// Report encapsulates SARIF generation utilities.
type Report struct {
	Schema  string      `json:"$schema"`
	Version string      `json:"version"`
	Runs    []ReportRun `json:"runs"`
}

// ReportRun describes a scanning run with results.
type ReportRun struct {
	Tool    ToolComponent `json:"tool"`
	Results []Result      `json:"results"`
}

// ToolComponent declares the scanning tool metadata.
type ToolComponent struct {
	Driver DriverComponent `json:"driver"`
}

// DriverComponent identifies the tool.
type DriverComponent struct {
	Name           string       `json:"name"`
	FullName       string       `json:"fullName"`
	Version        string       `json:"version"`
	InformationURI string       `json:"informationUri"`
	Rules          []DriverRule `json:"rules"`
}

// DriverRule enumerates the detection rules that fired.
type DriverRule struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	HelpURI     string `json:"helpUri"`
}

// Result corresponds to a single SARIF finding entry.
type Result struct {
	RuleID     string           `json:"ruleId"`
	Level      string           `json:"level"`
	Message    Message          `json:"message"`
	Locations  []ResultLocation `json:"locations"`
	Properties map[string]any   `json:"properties,omitempty"`
}

// Message is the text shown for the finding.
type Message struct {
	Text string `json:"text"`
}

// ResultLocation identifies where the finding occurred.
type ResultLocation struct {
	PhysicalLocation PhysicalLocation `json:"physicalLocation"`
}

// PhysicalLocation describes file location details.
type PhysicalLocation struct {
	ArtifactLocation ArtifactLocation `json:"artifactLocation"`
	Region           Region           `json:"region"`
}

// ArtifactLocation points to the artifact path.
type ArtifactLocation struct {
	URI string `json:"uri"`
}

// Region contains coordinates for the finding.
type Region struct {
	StartLine   int `json:"startLine"`
	StartColumn int `json:"startColumn"`
}

// FromFindings converts SSS findings into a SARIF report.
func FromFindings(toolVersion string, findings []models.Finding) Report {
	sorted := append([]models.Finding(nil), findings...)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].FilePath == sorted[j].FilePath {
			if sorted[i].Line == sorted[j].Line {
				return sorted[i].RuleID < sorted[j].RuleID
			}
			return sorted[i].Line < sorted[j].Line
		}
		return sorted[i].FilePath < sorted[j].FilePath
	})

	rules := make(map[string]DriverRule)
	for _, f := range sorted {
		if f.RuleID == "" {
			continue
		}
		if _, exists := rules[f.RuleID]; exists {
			continue
		}
		rules[f.RuleID] = DriverRule{
			ID:          f.RuleID,
			Name:        fmt.Sprintf("%s detection", f.SecretType),
			Description: f.Description,
			HelpURI:     "https://security-docs.invalid/sss",
		}
	}
	var ruleList []DriverRule
	for _, r := range rules {
		ruleList = append(ruleList, r)
	}
	sort.Slice(ruleList, func(i, j int) bool { return ruleList[i].ID < ruleList[j].ID })

	report := Report{
		Schema:  "https://json.schemastore.org/sarif-2.1.0.json",
		Version: "2.1.0",
		Runs: []ReportRun{
			{
				Tool: ToolComponent{
					Driver: DriverComponent{
						Name:           "Secrets Spill Sentinel",
						FullName:       "Secrets Spill Sentinel",
						Version:        toolVersion,
						InformationURI: "https://security-docs.invalid/sss",
						Rules:          ruleList,
					},
				},
			},
		},
	}

	for _, f := range sorted {
		level := "warning"
		switch f.Severity {
		case models.SeverityCritical, models.SeverityHigh:
			level = "error"
		case models.SeverityLow:
			level = "note"
		}
		report.Runs[0].Results = append(report.Runs[0].Results, Result{
			RuleID: f.RuleID,
			Level:  level,
			Message: Message{
				Text: fmt.Sprintf("%s (%s)", f.Description, f.SecretType),
			},
			Locations: []ResultLocation{
				{
					PhysicalLocation: PhysicalLocation{
						ArtifactLocation: ArtifactLocation{URI: f.FilePath},
						Region: Region{
							StartLine:   f.Line,
							StartColumn: f.Column,
						},
					},
				},
			},
			Properties: map[string]any{
				"match":      f.Match,
				"context":    f.Context,
				"confidence": f.Confidence,
				"id":         f.ID,
			},
		})
	}

	return report
}

// Write writes the report to disk as pretty JSON.
func (r Report) Write(path string) error {
	if path == "" {
		return fmt.Errorf("path required for SARIF report")
	}
	data, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}
