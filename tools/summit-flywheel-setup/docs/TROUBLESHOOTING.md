# Troubleshooting (Scaffolding)

Common issues at this stage:

- **Permission errors running scripts**: ensure files are executable.
  ```bash
  chmod +x install.sh bin/sfs scripts/preflight.sh
  ```
- **Unexpected arguments**: scaffolding accepts only a small subset of flags and
  ignores the rest. Full flag coverage arrives in PR2+.
- **Non-Ubuntu hosts**: full preflight support for distro validation will land in
  PR2. For now, the preflight script only reports detected OS/arch.

If problems persist, run with `bash -x` to capture debug traces and share logs
with the DevEx/SRE team.
