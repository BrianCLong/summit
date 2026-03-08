package main

import (
    "fmt"
    "log"
    "os"
    "frameworkrisk"
)

func main() {
    detected, err := frameworkrisk.DetectNextJS("../../")
    if err != nil {
        log.Fatalf("Error detecting framework: %v", err)
    }

    if !detected {
        fmt.Println("No targeted frameworks detected. Pass.")
        os.Exit(0)
    }

    fmt.Println("Target framework detected. Running evaluation...")
    report := frameworkrisk.EvaluateNextJSRisk()

    err = frameworkrisk.GenerateEvidence(report, "../../artifacts/framework-risk/")
    if err != nil {
        log.Fatalf("Failed to write evidence: %v", err)
    }

    threshold := 0.75
    if report.RiskScore > threshold {
        fmt.Printf("FAIL: Framework governance risk score %f exceeds threshold %f\n", report.RiskScore, threshold)
        // Respect feature flag
        if os.Getenv("FRAMEWORK_RISK_ENABLED") == "true" {
            os.Exit(1)
        } else {
            fmt.Println("WARN: Feature flag FRAMEWORK_RISK_ENABLED is not true. Bypassing failure.")
        }
    } else {
        fmt.Printf("PASS: Framework governance risk score %f is within threshold %f\n", report.RiskScore, threshold)
    }
}
