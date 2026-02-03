from pathlib import Path


def main() -> int:
    # Minimal enforcement: if dependency manifest changed, require a deps delta doc
    manifests = ["pyproject.toml", "requirements.txt", "package-lock.json", "pnpm-lock.yaml"]
    # In a real CI, we'd check git diff. Here we just check if manifests exist (as a proxy for being "active").
    # This means locally it always requires the delta doc if manifests exist.
    changed = [m for m in manifests if Path(m).exists()]

    delta_docs = [Path("deps/dependency_delta.md"), Path("docs/deps/dependency-delta.md")]

    if changed:
        if not any(d.exists() for d in delta_docs):
            print(f"FAIL: deps manifests present but dependency delta doc missing (checked {delta_docs})")
            return 2
    print("OK: dependency delta gate")
    return 0
if __name__ == "__main__":
    raise SystemExit(main())
