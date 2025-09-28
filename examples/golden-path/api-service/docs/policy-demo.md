# Policy Gate Demo

Run the following commands to observe pass/fail behavior:

```bash
opa eval --data policy/bundle.rego --input .opa/input.json 'data.goldenpath.allow'
opa eval --data policy/bundle.rego --input .opa/failing-input.json 'data.goldenpath.allow'
```

The first command returns `true`. The second returns `false` with denial reasons printed when using the CI workflow.
