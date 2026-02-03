import argparse
import sys

from . import eval as eval_cmd
from . import generate, validate
from .config import SkillForgeConfig


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="summit skillforge")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate")
    sub.add_parser("eval")
    sub.add_parser("generate")  # flagged
    return p


def main(argv=None) -> int:
    config = SkillForgeConfig.from_env()
    p = build_parser()
    args = p.parse_args(argv)

    if not config.SKILLFORGE_ENABLE:
        print(
            "SkillForge is disabled. Set SKILLFORGE_ENABLE=1 to enable.",
            file=sys.stderr,
        )
        return 1

    if args.cmd == "validate":
        return validate.run(args, config)
    elif args.cmd == "eval":
        return eval_cmd.run(args, config)
    elif args.cmd == "generate":
        return generate.run(args, config)

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
