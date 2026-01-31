# Summit Policy Gates

This directory contains definitions for policy gates used to enforce quality and security standards.

## Gates

The gates are defined in `gates.toml`. Currently, these are **temporary internal names** that will be mapped to the actual GitHub CI required check names once they are discovered.

## Rename Plan

Once the real required checks are identified (see `required_checks.todo.md`), we will:
1. Update `gates.toml` to map the temporary names to the real check names.
2. Update any tooling that references these gates.
3. Eventually deprecate the temporary names.
