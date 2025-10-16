import pathlib
import re
import sys

blocks = []
for p in pathlib.Path("docs").rglob("*.md*"):
    s = p.read_text(encoding="utf-8")
    blocks += re.findall(r"```py\s+test\s+compile\n([\s\S]*?)```", s)
code = "\n\n".join(blocks)
(tmp := pathlib.Path("tmp_snippets.py")).write_text(code, encoding="utf-8")
import pyflakes.api
import pyflakes.reporter

r = pyflakes.api.check(code, filename="tmp_snippets.py")
sys.exit(0 if r == 0 else 1)
