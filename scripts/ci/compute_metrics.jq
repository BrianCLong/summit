# CI Signal Gate - Compute metrics from GitHub Actions runs
# Deterministic jq transform for audit trail

def toEpoch: (.[0:19]+"Z") | fromdateiso8601;
def safe(t): if t==null or t=="" then null else (t|toEpoch) end;
def pct(n;d): if d==0 then 0 else ((n*100.0)/d) end;
def median(a):
  if (a|length)==0 then null
  else (a|sort) as $s | (($s|length) - 1) / 2 | floor as $mid |
    if (($s|length) % 2) == 1 then $s[$mid]
    else ($s[$mid] + $s[$mid + 1]) / 2 end
  end;
def percentile(a; p):
  if (a|length)==0 then null
  else (a|sort) as $s | (($s|length) * p) | floor as $idx |
    if $idx >= ($s|length) then $s[-1] else $s[$idx] end
  end;

. as $all
| ($all | map({
    workflow: .workflowName,
    createdAt, startedAt, updatedAt, status, conclusion,
    queue_s: ((safe(.startedAt) // 0) - (safe(.createdAt) // 0)),
    run_s:   ((safe(.updatedAt) // 0) - (safe(.startedAt) // 0)),
    total_s: ((safe(.updatedAt) // 0) - (safe(.createdAt) // 0))
  }) | map(select(.queue_s >= 0 and .run_s >= 0))) as $runs
| ($runs|length) as $n
| ($runs|map(select(.conclusion=="success"))|length) as $ok
| ($runs|map(.queue_s)|map(select(.!=null and . >= 0))) as $queues
| ($runs|map(.run_s)|map(select(.!=null and . >= 0))) as $runs_dur
| {
    repo: (env.GITHUB_REPOSITORY // "unknown"),
    generated_at: now | strftime("%Y-%m-%dT%H:%M:%SZ"),
    sample_size: $n,
    success_rate_pct: (pct($ok;$n) | . * 100 | floor | . / 100),
    queue_s: {
      p50: median($queues),
      p95: percentile($queues; 0.95)
    },
    run_s: {
      p50: median($runs_dur),
      p95: percentile($runs_dur; 0.95)
    },
    by_workflow:
      ($runs
       | group_by(.workflow)
       | map({
           workflow: .[0].workflow,
           sample_size: length,
           success_rate_pct: (pct((map(select(.conclusion=="success"))|length); length) | . * 100 | floor | . / 100),
           queue_s: {
             p50: median(map(.queue_s)),
             p95: percentile(map(.queue_s); 0.95)
           },
           run_s: {
             p50: median(map(.run_s)),
             p95: percentile(map(.run_s); 0.95)
           }
         })
       | sort_by(.sample_size) | reverse)
  }
