import os
from pathlib import Path
from packages.summit_decks.summit_decks.build import build_template_deck

def maybe_register(subparsers) -> None:
    if os.getenv("SUMMIT_DECKS", "0") != "1":
        return
    p = subparsers.add_parser("decks", help="experimental deck workflows")
    sp = p.add_subparsers(dest="decks_cmd")
    t = sp.add_parser("init", help="create a template beamer deck")
    t.add_argument("--out", default="deck_project")

def run(args) -> int:
    if args.decks_cmd == "init":
        build_template_deck(Path(args.out))
        print(f"created {args.out}/main.tex")
        return 0
    return 1
