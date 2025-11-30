package main

import (
	"encoding/json"
	"flag"
	"log"
	"os"

	"summit/security/supplychain/internal/policy"
	"summit/security/supplychain/internal/sbom"
	"summit/security/supplychain/internal/scan"
)

func main() {
	var (
		image      string
		format     string
		policyPath string
		reportPath string
		licenses   string
		attested   bool
	)

	flag.StringVar(&image, "image", "", "Container image to analyze")
	flag.StringVar(&format, "format", "spdx", "SBOM format: spdx|cyclonedx")
	flag.StringVar(&policyPath, "policy", "../policy.yaml", "Policy path")
	flag.StringVar(&reportPath, "report", "", "Path to vulnerability report")
	flag.StringVar(&licenses, "licenses", "", "Comma-separated license list for gating")
	flag.BoolVar(&attested, "attested", false, "Whether reproducible build attestation exists")
	flag.Parse()

	pol, err := policy.Load(policyPath)
	if err != nil {
		log.Fatalf("load policy: %v", err)
	}

	if err := policy.ValidateAttestation(attested, pol); err != nil {
		log.Fatalf("attestation gate: %v", err)
	}

	packages := []sbom.Package{{Name: "app", Version: "latest", License: "Apache-2.0"}}
	generator := sbom.New()
	var doc sbom.Document
	switch format {
	case "spdx":
		doc = generator.SPDX(image, packages)
	case "cyclonedx":
		doc = generator.CycloneDX(image, packages)
	default:
		log.Fatalf("unknown format: %s", format)
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(doc); err != nil {
		log.Fatalf("write sbom: %v", err)
	}

	if reportPath != "" {
		report, err := scan.LoadReport(reportPath)
		if err != nil {
			log.Fatalf("load report: %v", err)
		}
		failing, ok := scan.Gate(report, pol)
		if !ok {
			log.Fatalf("vulnerability gate failed: %+v", failing)
		}
	}

	if licenses != "" {
		licenseList := splitAndTrim(licenses)
		blocked, ok, err := policy.GateLicenses(licenseList, nil, pol)
		if err != nil {
			log.Fatalf("license exceptions invalid: %v", err)
		}
		if !ok {
			log.Fatalf("blocked licenses detected: %v", blocked)
		}
	}
}

func splitAndTrim(csv string) []string {
	out := make([]string, 0)
	for _, token := range split(csv) {
		if token == "" {
			continue
		}
		out = append(out, token)
	}
	return out
}

func split(csv string) []string {
	var parts []string
	current := ""
	for _, ch := range csv {
		if ch == ',' {
			parts = append(parts, current)
			current = ""
			continue
		}
		current += string(ch)
	}
	return append(parts, current)
}
