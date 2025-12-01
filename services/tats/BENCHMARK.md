# Performance Benchmarks

Executed with `cargo bench --bench perf` on the default container environment.

```
issue_token             time:   [29.913 µs 30.129 µs 30.364 µs]
verify_token            time:   [51.753 µs 51.990 µs 52.249 µs]
```

Plot artifacts are emitted under `target/criterion/` for deeper analysis.
