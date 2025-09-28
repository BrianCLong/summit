# Policy Inputs

`bundle.rego` is hydrated from the Golden Path OPA bundle. The GitHub Actions workflow assembles `.opa/input.json` combining SBOM, vulnerability, and secret scan outputs. Update `policy/overrides.rego` if the service requires additional gates.
