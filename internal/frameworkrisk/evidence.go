package frameworkrisk

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
)

// GenerateEvidence writes the risk evaluation to disk for CI validation.
func GenerateEvidence(report FrameworkRiskReport, outputDir string) error {
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return err
	}

	// 1. Write metrics.json
	metricsPath := filepath.Join(outputDir, "metrics.json")
	metricsData, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(metricsPath, metricsData, 0644); err != nil {
		return err
	}

	// 2. Generate deterministic stamp.json based on report content hash (no timestamps)
	hash := sha256.Sum256(metricsData)
	hashStr := hex.EncodeToString(hash[:])

	stamp := map[string]interface{}{
		"id":   "EVD-FRAMEWORKRISK-NEXTJS-" + hashStr[:12],
		"type": "framework_governance_risk",
		"hash": hashStr,
	}
	stampPath := filepath.Join(outputDir, "stamp.json")
	stampData, err := json.MarshalIndent(stamp, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(stampPath, stampData, 0644); err != nil {
		return err
	}

	// 3. Write a mock report.json conforming to expected schemas
	reportPath := filepath.Join(outputDir, "report.json")
	reportObj := map[string]interface{}{
		"framework": report.Framework,
		"status":    "evaluated",
		"version":   "1.0.0", // Mock schema version
	}
	reportData, err := json.MarshalIndent(reportObj, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(reportPath, reportData, 0644); err != nil {
		return err
	}

	return nil
}
