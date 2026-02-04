import argparse
import sys

from .runner import run


def main():
    parser = argparse.ArgumentParser(description="Solid Gate - Engineering Quality Guardrail")
    parser.add_argument("--diff-base", default="origin/main", help="Git reference base for diff")
    parser.add_argument("--enforce", action="store_true", help="Exit with error if failure findings exist")

    args = parser.parse_args()

    sys.exit(run(diff_base=args.diff_base, enforce=args.enforce))

if __name__ == "__main__":
    main()
