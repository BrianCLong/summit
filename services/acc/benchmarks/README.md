# ACC Planner Benchmarks

Benchmarks measure deterministic latency characteristics for the planner under different
consistency modes. They are designed to exhibit low variance by using pure CPU execution paths
with no network or I/O.

## Running

```bash
cd services/acc
go test -bench . -benchtime=2s -count=3 ./...
```

The `-count=3` flag collects three samples for each benchmark; the variance between runs should
remain under 5% thanks to the deterministic planner.

## Latest Sample

`latest.txt` contains the most recent benchmark output captured from the command above. Replace it
when re-running benchmarks to track regression over time.
