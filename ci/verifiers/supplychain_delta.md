# Supply-chain delta gate (spec)

Each PR must include:

- deps/dependency_delta.md describing added, removed, or updated dependencies

Gate fails if:

- lockfiles changed but dependency_delta.md not updated
