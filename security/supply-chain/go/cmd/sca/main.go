package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"path/filepath"
	"time"

	"summit/security-supply-chain/internal/attest"
	"summit/security-supply-chain/internal/license"
	"summit/security-supply-chain/internal/policy"
	"summit/security-supply-chain/internal/sbom"
)

func main() {
	command := flag.String("command", "help", "Command to run: sbom|license|vuln|attest|help")
	image := flag.String("image", "", "Container image to generate an SBOM for")
	policyPath := flag.String("policy", "../policy/policy.json", "Path to policy JSON")
	licensesPath := flag.String("licenses", "../policy/sample-licenses.json", "Path to license inventory")
	exceptionsPath := flag.String("exceptions", "../policy/license-exceptions.json", "Path to license exceptions")
	vulnsPath := flag.String("vulns", "../policy/sample-vulns.json", "Path to vulnerability report")
	format := flag.String("format", "cyclonedx", "SBOM format: spdx or cyclonedx")
	outDir := flag.String("out", "../../manifests", "Output directory")
	flag.Parse()

	if *command == "help" {
		flag.Usage()
		return
	}

	pol, err := policy.Load(*policyPath)
	if err != nil {
		log.Fatalf("unable to load policy: %v", err)
	}

	switch *command {
	case "sbom":
		if *image == "" {
			log.Fatal("--image is required for sbom command")
		}
		manifest, err := sbom.Generate(*image, *format, *outDir)
		if err != nil {
			log.Fatalf("failed to generate sbom: %v", err)
		}
		fmt.Printf("SBOM written to %s\n", manifest)
	case "license":
		licInv, err := license.LoadInventory(*licensesPath)
		if err != nil {
			log.Fatalf("failed to load license inventory: %v", err)
		}
		exceptions, err := license.LoadExceptions(*exceptionsPath)
		if err != nil {
			log.Fatalf("failed to load license exceptions: %v", err)
		}
		report := license.Evaluate(pol, licInv, exceptions)
		data, _ := json.MarshalIndent(report, "", "  ")
		if len(report.Violations) > 0 {
			fmt.Println(string(data))
			log.Fatalf("license policy violations detected")
		}
		fmt.Println(string(data))
	case "vuln":
		vulns, err := policy.LoadVulnerabilities(*vulnsPath)
		if err != nil {
			log.Fatalf("failed to load vulnerabilities: %v", err)
		}
		report := policy.EvaluateVulns(pol, vulns)
		data, _ := json.MarshalIndent(report, "", "  ")
		if len(report.Violations) > 0 {
			fmt.Println(string(data))
			log.Fatalf("vulnerability policy violations detected")
		}
		fmt.Println(string(data))
	case "attest":
		files, err := filepath.Glob(filepath.Join(*outDir, "*.json"))
		if err != nil {
			log.Fatalf("unable to read manifest directory: %v", err)
		}
		results := []attest.Result{}
		for _, f := range files {
			sig, err := attest.Sign(pol, f)
			if err != nil {
				log.Fatalf("failed to attest %s: %v", f, err)
			}
			results = append(results, sig)
		}
		data, _ := json.MarshalIndent(results, "", "  ")
		fmt.Printf("Attestations complete at %s\n%s\n", time.Now().UTC().Format(time.RFC3339), string(data))
	default:
		flag.Usage()
	}
}
