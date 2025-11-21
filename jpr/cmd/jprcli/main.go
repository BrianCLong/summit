package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/summit/jpr"
	"github.com/summit/jpr/cache"
)

func main() {
	var policyPath string
	var action string
	var jurisdiction string
	var dataClass string
	var purpose string
	var explain bool
	var mode string
	var at string
	var ttlSeconds int

	flag.StringVar(&policyPath, "policies", "", "Path to the policy YAML document")
	flag.StringVar(&action, "action", "", "Action to evaluate")
	flag.StringVar(&jurisdiction, "jurisdiction", "*", "Jurisdiction to evaluate")
	flag.StringVar(&dataClass, "data-class", "*", "Data class for the subject")
	flag.StringVar(&purpose, "purpose", "*", "Purpose for processing")
	flag.BoolVar(&explain, "explain", false, "Return the explanation chain")
	flag.StringVar(&mode, "mode", "evaluate", "Mode: evaluate or compile")
	flag.StringVar(&at, "at", "", "Decision time (YYYY-MM-DD). Defaults to now")
	flag.IntVar(&ttlSeconds, "ttl", 300, "Cache TTL in seconds")
	flag.Parse()

	if policyPath == "" {
		exitErr(fmt.Errorf("policies path is required"))
	}

	file, err := os.Open(policyPath)
	if err != nil {
		exitErr(err)
	}
	defer file.Close()

	doc, err := jpr.Parse(file)
	if err != nil {
		exitErr(err)
	}

	ttl := time.Duration(ttlSeconds) * time.Second
	engine, err := jpr.Compile(doc, ttl)
	if err != nil {
		exitErr(err)
	}

	switch mode {
	case "compile":
		export := engine.Export()
		output(export)
	case "evaluate":
		evaluate(engine, action, jurisdiction, dataClass, purpose, at, explain)
	default:
		exitErr(fmt.Errorf("unknown mode %s", mode))
	}
}

func evaluate(engine *jpr.Engine, action, jurisdiction, dataClass, purpose, at string, explain bool) {
	if action == "" {
		exitErr(fmt.Errorf("action is required in evaluate mode"))
	}
	when := time.Now().UTC()
	if at != "" {
		parsed, err := time.Parse("2006-01-02", at)
		if err != nil {
			exitErr(fmt.Errorf("invalid at value: %w", err))
		}
		when = parsed
	}
	subject := jpr.Subject{DataClass: dataClass, Traits: map[string]string{}}
	ctx := jpr.Context{Jurisdiction: jurisdiction, Purpose: purpose, DecisionTime: when, Facts: map[string]string{}}
	if explain {
		exp, err := engine.Explain(action, subject, ctx)
		if err != nil {
			exitErr(err)
		}
		output(exp)
		return
	}
	decision, err := engine.Can(action, subject, ctx)
	if err != nil {
		exitErr(err)
	}
	output(decision)
}

func output(v any) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		exitErr(err)
	}
}

func exitErr(err error) {
	fmt.Fprintf(os.Stderr, "jprcli error: %v\n", err)
	os.Exit(1)
}

// compileWithCache demonstrates TTL and ETag semantics for the CLI by reusing previous compilations.
func compileWithCache(ctx context.Context, cache *cache.EngineCache, doc jpr.PolicyDocument, ttl time.Duration) (*jpr.Engine, bool, error) {
	engine, err := jpr.Compile(doc, ttl)
	if err != nil {
		return nil, false, err
	}
	etag := engine.ETag()
	cached, hit, err := cache.GetOrLoad(ctx, etag, ttl, func(context.Context) (*jpr.Engine, error) {
		return engine, nil
	})
	return cached, hit, err
}
