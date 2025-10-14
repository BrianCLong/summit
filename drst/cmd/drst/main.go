package main

import (
	"encoding/json"
	"flag"
	"log"
	"os"

	"drst/pkg/agent"
	"drst/pkg/config"
	"drst/pkg/controller"
	"drst/pkg/probe"
	"drst/pkg/report"
	"drst/pkg/storage"
)

type regionMap map[string]string

func main() {
	var cfgPath string
	var seedOverride int64
	var regionMapPath string

	flag.StringVar(&cfgPath, "config", "", "path to DRST configuration YAML")
	flag.Int64Var(&seedOverride, "seed", 0, "override master seed for reproducible runs")
	flag.StringVar(&regionMapPath, "region-map", "", "optional path to JSON map of host/ip to region")
	flag.Parse()

	if cfgPath == "" {
		log.Fatal("--config path is required")
	}

	cfgFile, err := os.Open(cfgPath)
	if err != nil {
		log.Fatalf("open config: %v", err)
	}
	defer cfgFile.Close()

	cfg, err := config.Load(cfgFile)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	if seedOverride != 0 {
		cfg.Seed = seedOverride
	}

	var resolver probe.RegionResolver
	if regionMapPath != "" {
		file, err := os.Open(regionMapPath)
		if err != nil {
			log.Fatalf("open region map: %v", err)
		}
		defer file.Close()
		dec := json.NewDecoder(file)
		values := make(regionMap)
		if err := dec.Decode(&values); err != nil {
			log.Fatalf("decode region map: %v", err)
		}
		resolver = probe.DNSRegionResolver(values)
	}

	ag := agent.New(cfg.Seed)
	tracer := probe.NewDNSTracer(resolver)
	scanner := storage.NewFileSystemScanner()
	ctrl := controller.New(ag, tracer, scanner)

	result, err := ctrl.Run(cfg)
	if err != nil {
		log.Fatalf("controller run: %v", err)
	}

	if err := output(result); err != nil {
		log.Fatalf("output report: %v", err)
	}
}

func output(result report.ComplianceMap) error {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	return enc.Encode(result)
}
