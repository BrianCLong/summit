from pathlib import Path

from summit import flags

DEFAULT_SOUL = Path(__file__).parent / "defaults" / "Soul.md"

def load_persona(path: Path = None) -> str:
    if not flags.FEATURE_SOUL_MD:
        return ""

    p = path or DEFAULT_SOUL
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8")
