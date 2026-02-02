from __future__ import annotations
from pathlib import Path
import zipfile

def export_skill_to_zip(skill_root: Path, out_path: Path) -> None:
    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for p in sorted(skill_root.rglob("*")):
            if p.is_dir():
                continue
            z.write(p, arcname=str(p.relative_to(skill_root)))
