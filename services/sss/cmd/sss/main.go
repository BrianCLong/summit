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

// Config holds global configuration options
type Config struct {
	Mode string
	Scan ScanConfig
	Serve ServeConfig
}

type ScanConfig struct {
	Root             string
	Paths            string
	QuarantineDir    string
	QuarantineEnabled bool
	AutoRotate       bool
	SarifPath        string
	Annotate         bool
}

type ServeConfig struct {
	Addr          string
	QuarantineDir string
}

func main() {
	log.SetFlags(0)

	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}

	cmd := os.Args[1]
	args := os.Args[2:]

	switch cmd {
	case "scan":
		if err := runScan(args); err != nil {
			log.Fatal(err)
		}
	case "serve":
		if err := runServe(args); err != nil {
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
	var cfg ScanConfig
	fs := flag.NewFlagSet("scan", flag.ContinueOnError)
	fs.StringVar(&cfg.Root, "path", ".", "Root path to scan")
	fs.StringVar(&cfg.Paths, "paths", "", "Comma separated additional paths")
	fs.StringVar(&cfg.QuarantineDir, "quarantine-dir", ".sss_quarantine", "Directory where quarantine files are moved")
	fs.BoolVar(&cfg.QuarantineEnabled, "quarantine", false, "Quarantine files that trigger findings")
	fs.BoolVar(&cfg.AutoRotate, "auto-rotate", false, "Invoke auto-rotation hooks for supported providers")
	fs.StringVar(&cfg.SarifPath, "sarif", "", "Path to write SARIF report")
	fs.BoolVar(&cfg.Annotate, "annotate", false, "Emit GitHub Actions annotations")

	if err := fs.Parse(args); err != nil {
		return err
	}

	e, err := buildEngine()
	if err != nil {
		return err
	}
	s := scanner.New(e)

	if cfg.Annotate {
		s.Annotator = pr.New(os.Stdout)
	}
	if cfg.QuarantineEnabled {
		qm, err := quarantine.New(cfg.QuarantineDir, os.Stdout)
		if err != nil {
			return err
		}
		s.Quarantine = qm
	}
	s.Rotator = rotator.NewManager(os.Stdout)

	targets := collectTargets(cfg.Root, cfg.Paths)
	var aggregate []models.Finding
	for _, target := range targets {
		opts := scanner.Options{
			Root:             filepath.Clean(target),
			EnableQuarantine: cfg.QuarantineEnabled,
			EnableAutoRotate: cfg.AutoRotate,
			// MaxFileSize defaults to 10MB in scanner (0 value)
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

	if cfg.SarifPath != "" {
		report := sarif.FromFindings(version, aggregate)
		if err := report.Write(cfg.SarifPath); err != nil {
			return err
		}
		fmt.Printf("SARIF report written to %s\n", cfg.SarifPath)
	}

	return nil
}

func runServe(args []string) error {
	var cfg ServeConfig
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	fs.StringVar(&cfg.Addr, "addr", ":8080", "Address to bind the HTTP server")
	fs.StringVar(&cfg.QuarantineDir, "quarantine-dir", ".sss_quarantine", "Directory for quarantine operations")

	if err := fs.Parse(args); err != nil {
		return err
	}

	e, err := buildEngine()
	if err != nil {
		return err
	}

	factory := func() *scanner.Scanner {
		s := scanner.New(e)
		if qm, qerr := quarantine.New(cfg.QuarantineDir, os.Stdout); qerr == nil {
			s.Quarantine = qm
		}
		s.Rotator = rotator.NewManager(os.Stdout)
		return s
	}

	srv := server.New(factory)
	httpServer := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("sss service listening on %s", cfg.Addr)
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
