package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/summit/sss/pkg/detectors"
	"github.com/summit/sss/pkg/engine"
	"github.com/summit/sss/pkg/models"
	"github.com/summit/sss/pkg/pr"
	"github.com/summit/sss/pkg/quarantine"
	"github.com/summit/sss/pkg/rotator"
	"github.com/summit/sss/pkg/sarif"
	"github.com/summit/sss/pkg/scanner"
	"github.com/summit/sss/pkg/server"
)

const version = "0.1.0"

func main() {
	log.SetFlags(0)
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}

	subcommand := os.Args[1]
	switch subcommand {
	case "scan":
		if err := runScan(os.Args[2:]); err != nil {
			log.Fatal(err)
		}
	case "serve":
		if err := runServe(os.Args[2:]); err != nil {
			log.Fatal(err)
		}
	case "version":
		fmt.Println(version)
	default:
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "Secrets Spill Sentinel %s\n", version)
	fmt.Fprintf(os.Stderr, "Usage: sss <scan|serve|version> [options]\n")
}

func runScan(args []string) error {
	fs := flag.NewFlagSet("scan", flag.ContinueOnError)
	root := fs.String("path", ".", "Root path to scan")
	paths := fs.String("paths", "", "Comma separated additional paths")
	quarantineDir := fs.String("quarantine-dir", ".sss_quarantine", "Directory where quarantine files are moved")
	quarantineEnabled := fs.Bool("quarantine", false, "Quarantine files that trigger findings")
	autoRotate := fs.Bool("auto-rotate", false, "Invoke auto-rotation hooks for supported providers")
	sarifPath := fs.String("sarif", "", "Path to write SARIF report")
	annotate := fs.Bool("annotate", false, "Emit GitHub Actions annotations")
	if err := fs.Parse(args); err != nil {
		return err
	}

	e, err := buildEngine()
	if err != nil {
		return err
	}
	s := scanner.New(e)

	if *annotate {
		s.Annotator = pr.New(os.Stdout)
	}
	if *quarantineEnabled {
		qm, err := quarantine.New(*quarantineDir, os.Stdout)
		if err != nil {
			return err
		}
		s.Quarantine = qm
	}
	s.Rotator = rotator.NewManager(os.Stdout)

	targets := collectTargets(*root, *paths)
	var aggregate []models.Finding
	for _, target := range targets {
		opts := scanner.Options{
			Root:             filepath.Clean(target),
			EnableQuarantine: *quarantineEnabled,
			EnableAutoRotate: *autoRotate,
		}
		findings, err := s.Scan(opts)
		if err != nil {
			log.Printf("scan error for %s: %v", target, err)
			continue
		}
		aggregate = append(aggregate, findings...)
	}

	for _, finding := range aggregate {
		fmt.Printf("%s:%d:%d %s [%s]\n", finding.FilePath, finding.Line, finding.Column, finding.Description, finding.SecretType)
	}
	fmt.Printf("Total findings: %d\n", len(aggregate))

	if *sarifPath != "" {
		report := sarif.FromFindings(version, aggregate)
		if err := report.Write(*sarifPath); err != nil {
			return err
		}
		fmt.Printf("SARIF report written to %s\n", *sarifPath)
	}

	return nil
}

func runServe(args []string) error {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	addr := fs.String("addr", ":8080", "Address to bind the HTTP server")
	quarantineDir := fs.String("quarantine-dir", ".sss_quarantine", "Directory for quarantine operations")
	if err := fs.Parse(args); err != nil {
		return err
	}

	e, err := buildEngine()
	if err != nil {
		return err
	}

	factory := func() *scanner.Scanner {
		s := scanner.New(e)
		if qm, qerr := quarantine.New(*quarantineDir, os.Stdout); qerr == nil {
			s.Quarantine = qm
		}
		s.Rotator = rotator.NewManager(os.Stdout)
		return s
	}

	srv := server.New(factory)
	httpServer := &http.Server{
		Addr:              *addr,
		Handler:           srv.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("sss service listening on %s", *addr)
	return httpServer.ListenAndServe()
}

func buildEngine() (*engine.Engine, error) {
	detectors := []detectors.Detector{
		detectors.EntropyDetector{},
		detectors.RegexDetector{},
		detectors.ContextDetector{},
	}
	return engine.New(detectors...)
}

func collectTargets(root, extra string) []string {
	var targets []string
	if strings.TrimSpace(root) != "" {
		targets = append(targets, root)
	}
	if strings.TrimSpace(extra) == "" {
		return targets
	}
	for _, part := range strings.Split(extra, ",") {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			targets = append(targets, trimmed)
		}
	}
	return targets
}
