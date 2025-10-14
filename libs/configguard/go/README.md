# ConfigGuard (Go)

The Go implementation of ConfigGuard provides deterministic configuration loading with JSON Schema validation and environment variable interpolation policies.

## Usage

```go
schema := "./schema.json"
result, err := configguard.Load("./configs/service.yaml", schema, &configguard.LoadOptions{
    Interpolation: configguard.InterpolationPolicy{
        AllowList: []string{"DATABASE_URL"},
        Defaults: map[string]string{"DATABASE_URL": "postgres://localhost:5432/app"},
        OnMissing: configguard.MissingWarn,
    },
})
if err != nil {
    log.Fatal(err)
}
for _, diag := range result.Diagnostics {
    log.Printf("%s %s:%d %s", diag.Severity, diag.Pointer, diag.Line, diag.Message)
}
```

External `$ref` and remote `$schema` lookups are disabled to keep validation deterministic. Bundle any supporting schemas locally and provide their file paths to `Load` or `Validate`.

## Tests

```bash
cd libs/configguard/go
go test ./...
```
