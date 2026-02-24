import argparse

from .config import SkillForgeConfig


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="summit skillforge")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate")
    sub.add_parser("eval")
    sub.add_parser("generate")  # flagged
    return p

def main(argv=None) -> int:
    _ = SkillForgeConfig()  # TODO: load from env / summit config
    p = build_parser()
    args = p.parse_args(argv)
    # TODO: route commands in PR2/PR4/PR5
    raise SystemExit(f"skillforge command not yet implemented: {args.cmd}")

if __name__ == "__main__":
    raise SystemExit(main())
