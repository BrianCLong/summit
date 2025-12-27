# CI: SLO & Evidence Gates (upgrade)

### `.github/workflows/ci.yml` (append job)

```yaml
slo-and-bundle:
  runs-on: ubuntu-latest
  needs: [build-test]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: "20" }
    - name: Launch services
      run: |
        docker compose up -d --build neo4j postgres opa api
        sleep 15
        cat db/neo4j/constraints.cypher | docker exec -i $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p neo4jpassword
    - name: Ingest demo
      run: npm --prefix ingest ci && npm --prefix ingest run demo || true
    - name: k6 SLO smoke
      uses: grafana/k6-action@v0.3.1
      with:
        filename: ops/k6/api-smoke.js
    - name: k6 Cypher 1-hop
      uses: grafana/k6-action@v0.3.1
      with:
        filename: ops/k6/cypher-load.js
    - name: Evidence bundle
      run: |
        bash scripts/evidence.sh
    - name: Upload bundle
      uses: actions/upload-artifact@v4
      with:
        name: evidence-bundle
        path: |
          .evidence
          evidence_*.tgz
          evidence_*.tgz.sha256
```

### PR Gate (status policy)

- Require **build-test** and **slo-and-bundle** jobs to pass.
- Failing thresholds auto-block merge; artifact bundle attached.
