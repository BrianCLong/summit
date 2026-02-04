# Codegen Drift (spec)

Must fail if:
- Generator execution returns non-zero exit code.
- Uncommitted changes are detected in 'generated/' directory after running generators.

Must pass if:
- Generators run successfully and 'generated/' remains identical to the committed state.
