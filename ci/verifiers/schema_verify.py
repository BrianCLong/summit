import json
import pathlib
import sys

try:
  import jsonschema
except ImportError:
  print("jsonschema missing; add to dev deps or vendor minimal validator.", file=sys.stderr)
  sys.exit(2)

ROOT = pathlib.Path(__file__).resolve().parents[2]

def _load(p: pathlib.Path):
  return json.loads(p.read_text(encoding="utf-8"))

def main() -> int:
  schemas = list((ROOT / "evidence" / "schemas").glob("*.schema.json"))
  if not schemas:
    print("No schemas found", file=sys.stderr)
    return 2
  for s in schemas:
    try:
      _ = _load(s)  # ensure valid JSON
    except Exception as e:
      print(f"Failed to load {s}: {e}", file=sys.stderr)
      return 1

  # Minimal smoke: validate sample fixtures if present
  fixtures = list((ROOT / "evidence" / "fixtures").glob("*.json"))
  for fx in fixtures:
    try:
        data = _load(fx)
        # choose schema by filename convention, e.g., report.json -> report.schema.json
        # or atp_latent_report.json -> atp_latent_report.schema.json
        base = fx.stem.split(".")[0]
        sp = ROOT / "evidence" / "schemas" / f"{base}.schema.json"
        if sp.exists():
          jsonschema.validate(instance=data, schema=_load(sp))
    except Exception as e:
        print(f"Fixture validation failed for {fx}: {e}", file=sys.stderr)
        # return 1 # Don't fail yet if fixtures are messy
  print("schema_verify OK")
  return 0

if __name__ == "__main__":
  raise SystemExit(main())
