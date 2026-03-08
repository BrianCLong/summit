import json
import pathlib
import sys

try:
    import jsonschema
except ImportError:
    print(
        "jsonschema missing; add to dev deps or vendor minimal validator.",
        file=sys.stderr,
    )
    sys.exit(2)

ROOT = pathlib.Path(__file__).resolve().parents[2]


def _load(path: pathlib.Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    schemas = list((ROOT / "evidence" / "schemas").glob("*.schema.json"))
    if not schemas:
        print("No schemas found", file=sys.stderr)
        return 2
    for schema_path in schemas:
        _ = _load(schema_path)
    fixtures = list((ROOT / "evidence" / "fixtures").glob("*.json"))
    for fixture_path in fixtures:
        data = _load(fixture_path)
        base = fixture_path.stem.split(".")[0]
        schema_path = ROOT / "evidence" / "schemas" / f"{base}.schema.json"
        if schema_path.exists():
            jsonschema.validate(instance=data, schema=_load(schema_path))
    print("schema_verify OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
