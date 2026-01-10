# Telemetry Correlation Evidence

Sample run of the obs SDK demo shows consistent `trace_id` across log lines and spans:

```
{"ts":"2025-12-29T22:16:23.470Z","level":"info","message":"span.start","trace_id":"653d17add81cb671fc3aae106e2d56d2","span_id":"79f64af4242b48b1","request_id":"6550c8577888ee0534ba9ba3","actor":"analyst-1","customer_id":"cust-123","decision_id":"dec-999","service":"obs-demo-service","span":"demo.root","attributes":{"feature":"observability-kit"}}
{"ts":"2025-12-29T22:16:23.481Z","level":"info","message":"demo.child.log","trace_id":"653d17add81cb671fc3aae106e2d56d2","span_id":"ac19b2d44c9db5ff","request_id":"6550c8577888ee0534ba9ba3","actor":"analyst-1","customer_id":"cust-123","decision_id":"dec-999","service":"obs-demo-service","detail":"child doing work"}
```

Both log lines share `trace_id=653d17add81cb671fc3aae106e2d56d2`, demonstrating cross-span correlation ready for trace viewers and log search.
