package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/summit/rbo/internal/core"
	"github.com/summit/rbo/internal/model"
	"github.com/summit/rbo/internal/plan"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}
	cmd := os.Args[1]
	switch cmd {
	case "simulate":
		runSimulate(os.Args[2:])
	case "plan":
		runPlan(os.Args[2:])
	case "execute":
		runExecute(os.Args[2:])
	case "diff":
		runDiff(os.Args[2:])
	case "fast-undo":
		runFastUndo(os.Args[2:])
	case "help", "-h", "--help":
		usage()
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n", cmd)
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "rbo orchestrator commands:\n")
	fmt.Fprintf(os.Stderr, "  simulate --state state.json --targets type:name[,type:name]\n")
	fmt.Fprintf(os.Stderr, "  plan --state state.json --targets type:name[,type:name] [--out plan.json]\n")
	fmt.Fprintf(os.Stderr, "  execute --state state.json --plan plan.json [--out new-state.json]\n")
	fmt.Fprintf(os.Stderr, "  diff --a planA.json --b planB.json\n")
	fmt.Fprintf(os.Stderr, "  fast-undo --state state.json --target type:name [--out plan.json]\n")
}

func runSimulate(args []string) {
	fs := flag.NewFlagSet("simulate", flag.ExitOnError)
	statePath := fs.String("state", "", "path to system state JSON")
	targets := fs.String("targets", "", "comma separated artifact references")
	mustParse(fs.Parse(args))
	if *statePath == "" || *targets == "" {
		fmt.Fprintln(os.Stderr, "state and targets are required")
		fs.Usage()
		os.Exit(1)
	}
	state := mustLoadState(*statePath)
	o := core.NewOrchestrator(state)
	refs := parseTargets(*targets)
	report, err := o.SimulateImpact(refs)
	if err != nil {
		exitErr(err)
	}
	encodeJSON(report)
}

func runPlan(args []string) {
	fs := flag.NewFlagSet("plan", flag.ExitOnError)
	statePath := fs.String("state", "", "path to system state JSON")
	targets := fs.String("targets", "", "comma separated artifact references")
	out := fs.String("out", "", "optional file to write plan")
	mustParse(fs.Parse(args))
	if *statePath == "" || *targets == "" {
		fmt.Fprintln(os.Stderr, "state and targets are required")
		fs.Usage()
		os.Exit(1)
	}
	state := mustLoadState(*statePath)
	o := core.NewOrchestrator(state)
	planObj, err := o.PlanRollback(parseTargets(*targets))
	if err != nil {
		exitErr(err)
	}
	if *out != "" {
		if err := plan.Save(planObj, *out); err != nil {
			exitErr(err)
		}
	}
	encodeJSON(planObj)
}

func runFastUndo(args []string) {
	fs := flag.NewFlagSet("fast-undo", flag.ExitOnError)
	statePath := fs.String("state", "", "path to system state JSON")
	target := fs.String("target", "", "single artifact reference")
	out := fs.String("out", "", "optional file to write plan")
	mustParse(fs.Parse(args))
	if *statePath == "" || *target == "" {
		fmt.Fprintln(os.Stderr, "state and target are required")
		fs.Usage()
		os.Exit(1)
	}
	state := mustLoadState(*statePath)
	o := core.NewOrchestrator(state)
	ref := parseTargets(*target)
	if len(ref) != 1 {
		exitErr(fmt.Errorf("fast-undo expects a single target"))
	}
	planObj, err := o.FastUndo(ref[0])
	if err != nil {
		exitErr(err)
	}
	if *out != "" {
		if err := plan.Save(planObj, *out); err != nil {
			exitErr(err)
		}
	}
	encodeJSON(planObj)
}

func runExecute(args []string) {
	fs := flag.NewFlagSet("execute", flag.ExitOnError)
	statePath := fs.String("state", "", "path to system state JSON")
	planPath := fs.String("plan", "", "path to rollback plan JSON")
	out := fs.String("out", "", "optional output state path")
	mustParse(fs.Parse(args))
	if *statePath == "" || *planPath == "" {
		fmt.Fprintln(os.Stderr, "state and plan are required")
		fs.Usage()
		os.Exit(1)
	}
	state := mustLoadState(*statePath)
	o := core.NewOrchestrator(state)
	planObj := mustLoadPlan(*planPath)
	if err := o.Execute(planObj); err != nil {
		exitErr(err)
	}
	if *out != "" {
		if err := o.State().Save(*out); err != nil {
			exitErr(err)
		}
	}
	encodeJSON(o.State())
}

func runDiff(args []string) {
	fs := flag.NewFlagSet("diff", flag.ExitOnError)
	planA := fs.String("a", "", "first plan path")
	planB := fs.String("b", "", "second plan path")
	mustParse(fs.Parse(args))
	if *planA == "" || *planB == "" {
		fmt.Fprintln(os.Stderr, "plan paths are required")
		fs.Usage()
		os.Exit(1)
	}
	pa := mustLoadPlan(*planA)
	pb := mustLoadPlan(*planB)
	diff := plan.Diff(pa, pb)
	encodeJSON(diff)
}

func parseTargets(input string) []model.ArtifactRef {
	entries := strings.Split(input, ",")
	refs := make([]model.ArtifactRef, 0, len(entries))
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		parts := strings.SplitN(entry, ":", 2)
		if len(parts) != 2 {
			exitErr(fmt.Errorf("invalid artifact reference %q", entry))
		}
		refs = append(refs, model.ArtifactRef{Type: model.ArtifactType(parts[0]), Name: parts[1]})
	}
	return refs
}

func encodeJSON(v any) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		exitErr(err)
	}
}

func mustParse(err error) {
	if err != nil {
		exitErr(err)
	}
}

func mustLoadState(path string) *core.SystemState {
	state, err := core.LoadStateFromFile(path)
	if err != nil {
		exitErr(err)
	}
	return state
}

func mustLoadPlan(path string) plan.RollbackPlan {
	p, err := plan.LoadFromFile(path)
	if err != nil {
		exitErr(err)
	}
	return p
}

func exitErr(err error) {
	fmt.Fprintf(os.Stderr, "error: %v\n", err)
	os.Exit(1)
}
