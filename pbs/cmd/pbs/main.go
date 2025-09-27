package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/summit/pbs/internal/pbs"
)

func main() {
	historyPath := flag.String("history", "", "path to historical decisions JSON")
	policyPath := flag.String("policy", "", "path to policy snapshot JSON")
	reportPath := flag.String("report", "", "path to write the backtest report JSON")
	recommendationPath := flag.String("recommendation", "", "path to write the rollout recommendation")
	signingKeyPath := flag.String("signing-key", "", "path to signing key JSON (optional)")
	flag.Parse()

	if *historyPath == "" || *policyPath == "" {
		flag.Usage()
		os.Exit(1)
	}

	history, historyDigest, err := pbs.LoadHistory(*historyPath)
	if err != nil {
		log.Fatalf("load history: %v", err)
	}

	policy, err := pbs.LoadPolicy(*policyPath)
	if err != nil {
		log.Fatalf("load policy: %v", err)
	}

	engine, err := pbs.NewEngine(policy)
	if err != nil {
		log.Fatalf("construct engine: %v", err)
	}

	summary, impacts, _ := engine.Run(history)
	report := pbs.BuildReport(summary, impacts, policy, historyDigest)

	if *signingKeyPath != "" {
		key, err := pbs.LoadSigningKey(*signingKeyPath)
		if err != nil {
			log.Fatalf("load signing key: %v", err)
		}
		report, err = pbs.SignReport(report, key)
		if err != nil {
			log.Fatalf("sign report: %v", err)
		}
	}

	if *reportPath != "" {
		if err := pbs.WriteJSON(*reportPath, report); err != nil {
			log.Fatalf("write report: %v", err)
		}
		fmt.Printf("wrote report to %s\n", *reportPath)
	}

	recommendation := pbs.BuildRecommendation(report)
	if *recommendationPath != "" {
		if err := pbs.WriteText(*recommendationPath, recommendation); err != nil {
			log.Fatalf("write recommendation: %v", err)
		}
		fmt.Printf("wrote recommendation to %s\n", *recommendationPath)
	}

	if *reportPath == "" && *recommendationPath == "" {
		fmt.Println(recommendation)
	}
}
