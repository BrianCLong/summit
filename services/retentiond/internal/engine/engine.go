package engine

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/summit/services/retentiond/internal/config"
	"github.com/summit/services/retentiond/internal/policy"
	"github.com/summit/services/retentiond/internal/receipts"
	"github.com/summit/services/retentiond/internal/storage"
)

// Result captures the outcome of processing a policy.
type Result struct {
	Policy        string
	Cutoff        time.Time
	Targets       []TargetResult
	ReceiptPath   string
	DryRun        bool
	ReceiptRoot   string
	ReceiptIssued bool
}

// TargetResult summarises action taken against a target.
type TargetResult struct {
	Type         string
	Identifier   string
	Expired      []string
	DeletedCount int
}

// Engine coordinates applying compiled policies.
type Engine struct {
	ObjectStore storage.ObjectStore
	Database    storage.Database
	Receipts    *receipts.FileWriter
	DryRun      bool
}

// Run executes each policy once returning per-policy results.
func (e *Engine) Run(ctx context.Context, cfg config.Config, now time.Time) ([]Result, error) {
	results := make([]Result, 0, len(cfg.Policies))
	for _, pol := range cfg.Policies {
		compiled := policy.Compile(pol, now)
		res, err := e.applyPolicy(ctx, cfg, compiled)
		if err != nil {
			return nil, fmt.Errorf("apply policy %s: %w", pol.Name, err)
		}
		results = append(results, res)
	}
	return results, nil
}

func (e *Engine) applyPolicy(ctx context.Context, cfg config.Config, compiled policy.CompiledPolicy) (Result, error) {
	builder := receipts.NewBuilder(compiled.Policy.Name)
	policyResult := Result{
		Policy:  compiled.Policy.Name,
		Cutoff:  compiled.Cutoff,
		Targets: make([]TargetResult, 0, len(compiled.Targets)),
		DryRun:  cfg.DryRun || e.DryRun,
	}

	for _, target := range compiled.Targets {
		switch target.Config.Type {
		case "s3":
			tr, err := e.handleS3(ctx, cfg, compiled.Policy, target, builder)
			if err != nil {
				return Result{}, err
			}
			policyResult.Targets = append(policyResult.Targets, tr)
		case "postgres":
			tr, err := e.handlePostgres(ctx, cfg, compiled.Policy, target, builder)
			if err != nil {
				return Result{}, err
			}
			policyResult.Targets = append(policyResult.Targets, tr)
		default:
			return Result{}, fmt.Errorf("unsupported target type %q", target.Config.Type)
		}
	}

	if policyResult.DryRun {
		return policyResult, nil
	}

	receipt, err := builder.Build()
	if err != nil {
		return Result{}, fmt.Errorf("build receipt: %w", err)
	}
	policyResult.ReceiptRoot = receipt.Root
	policyResult.ReceiptIssued = true
	if e.Receipts != nil {
		path, err := e.Receipts.Write(ctx, receipt)
		if err != nil {
			return Result{}, fmt.Errorf("write receipt: %w", err)
		}
		policyResult.ReceiptPath = path
	}
	return policyResult, nil
}

func (e *Engine) handleS3(ctx context.Context, cfg config.Config, pol config.Policy, target policy.CompiledTarget, builder *receipts.Builder) (TargetResult, error) {
	if e.ObjectStore == nil {
		return TargetResult{}, fmt.Errorf("object store not configured")
	}
	identifier := fmt.Sprintf("s3://%s/%s", target.Config.Bucket, target.Config.Prefix)
	expired, err := e.ObjectStore.ListExpired(ctx, target.Config.Bucket, target.Config.Prefix, target.Cutoff.Unix())
	if err != nil {
		return TargetResult{}, fmt.Errorf("list expired objects: %w", err)
	}
	keys := make([]string, len(expired))
	identifiers := make([]string, len(expired))
	for i, obj := range expired {
		keys[i] = obj.Key
		identifiers[i] = fmt.Sprintf("%s#%s", identifier, obj.Key)
		builder.Add("s3", identifiers[i])
	}
	if !(cfg.DryRun || e.DryRun) {
		if err := e.ObjectStore.Delete(ctx, target.Config.Bucket, keys); err != nil {
			return TargetResult{}, fmt.Errorf("delete objects: %w", err)
		}
		days := int(pol.RetainFor.Hours() / 24)
		if days < 1 {
			days = 1
		}
		if err := e.ObjectStore.PlanLifecycle(ctx, target.Config.Bucket, target.Config.Prefix, days); err != nil {
			return TargetResult{}, fmt.Errorf("plan lifecycle: %w", err)
		}
	}
	return TargetResult{
		Type:         "s3",
		Identifier:   identifier,
		Expired:      identifiers,
		DeletedCount: len(keys),
	}, nil
}

func (e *Engine) handlePostgres(ctx context.Context, cfg config.Config, pol config.Policy, target policy.CompiledTarget, builder *receipts.Builder) (TargetResult, error) {
	if e.Database == nil {
		return TargetResult{}, fmt.Errorf("database not configured")
	}
	rows, err := e.Database.ListExpired(ctx, target.Config.Table, target.Config.TimestampColumn, target.Config.Filter, target.Config.KeyColumns, target.Cutoff.Unix())
	if err != nil {
		return TargetResult{}, fmt.Errorf("list expired rows: %w", err)
	}
	identifiers := make([]string, len(rows))
	for i, row := range rows {
		identifiers[i] = formatRow(target.Config.Table, row.Keys)
		builder.Add("postgres", identifiers[i])
	}
	if !(cfg.DryRun || e.DryRun) {
		if err := e.Database.Delete(ctx, target.Config.Table, rows, target.Config.KeyColumns); err != nil {
			return TargetResult{}, fmt.Errorf("delete rows: %w", err)
		}
		if err := e.Database.EnsureTTL(ctx, target.Config.Table, target.Config.TimestampColumn, pol.RetainFor.String()); err != nil {
			return TargetResult{}, fmt.Errorf("ensure ttl: %w", err)
		}
	}
	return TargetResult{
		Type:         "postgres",
		Identifier:   target.Config.Table,
		Expired:      identifiers,
		DeletedCount: len(rows),
	}, nil
}

func formatRow(table string, keys map[string]string) string {
	parts := make([]string, 0, len(keys))
	for col, val := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", col, val))
	}
	// deterministic order
	sort.Strings(parts)
	return fmt.Sprintf("%s(%s)", table, strings.Join(parts, ","))
}
