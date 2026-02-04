from __future__ import annotations
from pathlib import Path

def build_template_deck(out_dir: Path) -> Path:
    """
    Creates a minimal Beamer project in out_dir.
    No AI, no shell, deterministic file contents.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "main.tex").write_text(
        r"""\documentclass{beamer}
\title{Template Deck}
\author{Summit}
\date{}
\begin{document}
\frame{\titlepage}
\begin{frame}{One slide}
Hello.
\end{frame}
\end{document}
""",
        encoding="utf-8",
    )
    return out_dir / "main.tex"
