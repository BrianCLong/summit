import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
POLICY_FIXTURES = ROOT / "fixtures" / "policy"

REQUIRED = {
    "deny_by_default.yaml": "default: deny",
    "allow_minimal.yaml": "allow_read_public",
}


def main() -> int:
    for filename, needle in REQUIRED.items():
        path = POLICY_FIXTURES / filename
        if not path.exists():
            print(f"FAIL missing {path}")
            return 2
        content = path.read_text(encoding="utf-8")
        if needle not in content:
            print(f"FAIL missing '{needle}' in {filename}")
            return 2
    print("OK policy fixtures present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
