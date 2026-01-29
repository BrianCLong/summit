def toEpoch: (.[0:19]+"Z") | fromdateiso8601;
def safe(t): if t==null or t=="" then null else (t|toEpoch) end;
def pct(n;d): if d==0 then 0 else ((n*100.0)/d) end;
def median(a):
    if (a|length)==0 then null
    else
      (a|sort) as $s
      | ($s | length) as $l
      | ($s[($l-1)/2 | floor] + $s[$l/2 | floor]) / 2
    end;

. as $all
| ($all | map({
    workflow: .workflowName,
    createdAt, startedAt, updatedAt, status, conclusion,
    queue_s: ( (safe(.startedAt) - safe(.createdAt)) ),
    run_s:    ( (safe(.updatedAt) - safe(.startedAt)) ),
    total_s:  ( (safe(.updatedAt) - safe(.createdAt)) )
  })) as $runs

# Overall metrics
| ($runs | length) as $n
| ($runs | map(select(.conclusion=="success")) | length) as $ok
| ($runs | map(.queue_s) | map(select(.!=null))) as $queues
| ($runs | map(.run_s)   | map(select(.!=null))) as $runs_dur

| {
    repo: $repo,
    sample_size: $n,
    success_rate_pct: (pct($ok; $n)),
    queue_s: { p50: median($queues), p95: ($queues|sort|.[(length*0.95)|floor]//null) },
    run_s:   { p50: median($runs_dur), p95: ($runs_dur|sort|.[(length*0.95)|floor]//null) },
    by_workflow:
      ( $runs
        | group_by(.workflow)
        | map({
            workflow: .[0].workflow,
            sample_size: length,
            success_rate_pct: (pct( (map(select(.conclusion=="success"))|length); length )),
            queue_s: { p50: median(map(.queue_s)), p95: (map(.queue_s)|sort|.[(length*0.95)|floor]//null) },
            run_s:   { p50: median(map(.run_s)),   p95: (map(.run_s)|sort|.[(length*0.95)|floor]//null) }
          })
      ),
    runs: $runs
  }
