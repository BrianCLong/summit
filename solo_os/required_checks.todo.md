# Required CI Checks for Solo OS

Once integrated into the main CI pipeline, ensure the following checks are active:

- [ ] `solo_os_verify`: Runs `bash solo_os/ci/verify_solo_os.sh`.
- [ ] `solo_os_gate_tests`: Runs `python3 -m unittest solo_os/eval/test_gate_fixtures.py`.
- [ ] `solo_os_schema_validation`: Validates all generated evidence against schemas in `solo_os/evidence/*.schema.json`.

## GitHub UI Setup Steps

1. Go to **Settings** > **Branches** in the repository.
2. Select the branch protection rule for `main`.
3. Enable **Require status checks to pass before merging**.
4. Search for and add the checks listed above (`solo_os_verify`, etc.).

## Rename Plan

If the organization requires a specific naming convention for checks, rename `solo_os_verify` to the appropriate value in `.github/workflows/`.
