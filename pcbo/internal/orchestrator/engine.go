package orchestrator

import (
	"sort"
	"time"
)

// Engine executes deterministic planning, dry-run, and execution flows.
type Engine struct{}

// NewEngine constructs a stateless Engine.
func NewEngine() Engine {
	return Engine{}
}

// Plan returns the partitioning for the supplied request.
func (Engine) Plan(req NormalizedRequest) []Partition {
	return BuildPartitions(req.Start, req.End, req.ChunkSize)
}

// DryRun produces the diff between source records and current target state.
func (e Engine) DryRun(req NormalizedRequest) DryRunResult {
	plan := e.Plan(req)
	chunks := make([]DryRunChunk, 0, len(plan))
	summary := DryRunSummary{}

	for _, partition := range plan {
		records := filterRecords(req, partition)
		violations := evaluatePolicies(req, records)
		chunk := DryRunChunk{
			Partition:        partition,
			Adds:             []string{},
			Duplicates:       []string{},
			PolicyViolations: violations,
		}
		if len(violations) > 0 {
			chunk.Status = "blocked"
			summary.TotalBlocked++
		} else {
			adds, duplicates := splitAdds(records, req.ExistingTargetIDs)
			chunk.Status = statusFromAdds(adds, duplicates)
			chunk.Adds = adds
			chunk.Duplicates = duplicates
			summary.TotalAdds += len(adds)
			summary.TotalDuplicates += len(duplicates)
		}
		chunks = append(chunks, chunk)
	}

	return DryRunResult{
		RunID:    req.RunID,
		Dataset:  req.Dataset,
		Plan:     plan,
		Chunks:   chunks,
		Summary:  summary,
		Metadata: req.Metadata,
	}
}

// Execute performs the backfill if no policy violations occur.
func (e Engine) Execute(req NormalizedRequest) ExecutionResult {
	plan := e.Plan(req)
	existing := copySet(req.ExistingTargetIDs)
	report := ReconciliationReport{
		RunID:            req.RunID,
		Dataset:          req.Dataset,
		GeneratedAt:      time.Now().UTC(),
		Summary:          ReportSummary{},
		Partitions:       make([]PartitionReport, 0, len(plan)),
		PolicyViolations: []PolicyViolation{},
		Metadata:         req.Metadata,
	}
	manifest := RollbackManifest{
		RunID:       req.RunID,
		GeneratedAt: report.GeneratedAt,
		Entries:     make([]RollbackEntry, 0, len(plan)),
		Metadata:    req.Metadata,
	}

	for _, partition := range plan {
		records := filterRecords(req, partition)
		violations := evaluatePolicies(req, records)
		adds, duplicates := splitAdds(records, existing)
		partitionReport := PartitionReport{
			Partition:        partition,
			Duplicates:       duplicates,
			PolicyViolations: violations,
			Proof: PartitionProof{
				Partition: partition,
				Count:     0,
				Merkle:    "",
			},
		}

		if len(violations) > 0 {
			partitionReport.Status = "blocked"
			report.Summary.BlockedPartitions++
			report.PolicyViolations = append(report.PolicyViolations, violations...)
			manifest.Entries = append(manifest.Entries, RollbackEntry{Partition: partition, RecordIDs: []string{}})
			report.Partitions = append(report.Partitions, partitionReport)
			continue
		}

		if len(adds) == 0 {
			partitionReport.Status = "noop"
		} else {
			partitionReport.Status = "applied"
			partitionReport.AppliedRecords = len(adds)
			report.Summary.AppliedRecords += len(adds)
			manifest.Entries = append(manifest.Entries, RollbackEntry{Partition: partition, RecordIDs: adds})
			for _, id := range adds {
				existing[id] = struct{}{}
			}
			partitionReport.Proof = PartitionProof{
				Partition: partition,
				Count:     len(adds),
				Merkle:    ComputeMerkleRoot(adds),
			}
		}

		if len(duplicates) > 0 {
			report.Summary.DuplicateRecords += len(duplicates)
		}

		partitionReport.Duplicates = duplicates
		report.Partitions = append(report.Partitions, partitionReport)
	}

	if len(manifest.Entries) == 0 {
		manifest.Entries = []RollbackEntry{}
	}

	return ExecutionResult{
		Plan:     plan,
		Report:   report,
		Rollback: manifest,
	}
}

func filterRecords(req NormalizedRequest, partition Partition) []Record {
	records := make([]Record, 0)
	for _, record := range req.SourceRecords {
		if (record.OccurredAt.Equal(partition.RangeFrom) || record.OccurredAt.After(partition.RangeFrom)) && record.OccurredAt.Before(partition.RangeTo) {
			records = append(records, record)
		}
	}
	return records
}

func splitAdds(records []Record, existing map[string]struct{}) ([]string, []string) {
	adds := make([]string, 0)
	duplicates := make([]string, 0)
	for _, record := range records {
		if _, found := existing[record.ID]; found {
			duplicates = append(duplicates, record.ID)
		} else {
			adds = append(adds, record.ID)
		}
	}
	sort.Strings(adds)
	sort.Strings(duplicates)
	return adds, duplicates
}

func statusFromAdds(adds, duplicates []string) string {
	if len(adds) == 0 {
		if len(duplicates) == 0 {
			return "noop"
		}
		return "deduplicated"
	}
	return "applied"
}

func copySet(in map[string]struct{}) map[string]struct{} {
	out := make(map[string]struct{}, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}
