package compliance.lib_time

parse_ns(ts) := time.parse_rfc3339_ns(ts)

elapsed_days(start_ts, end_ts) := days {
  s := parse_ns(start_ts)
  e := parse_ns(end_ts)
  diff := e - s
  days := diff / 1000000000 / 60 / 60 / 24
}
