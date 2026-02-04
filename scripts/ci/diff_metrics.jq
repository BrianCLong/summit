{
  repo: $cur.repo,
  today: { success_rate_pct: $cur.success_rate_pct, queue_p50_s: $cur.queue_s.p50 },
  yesterday: (if $prev==null then null else { success_rate_pct: $prev.success_rate_pct, queue_p50_s: $prev.queue_s.p50 } end),
  deltas: (if $prev==null then null else {
    success_rate_pct: ($cur.success_rate_pct - $prev.success_rate_pct),
    queue_p50_s: ($cur.queue_s.p50 - $prev.queue_s.p50)
  } end)
}
