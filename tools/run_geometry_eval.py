import sys
import argparse
from pathlib import Path
from summit.evals.geometry_complexity_eval import run_synthetic_eval

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=str, required=True)
    args = parser.parse_args()

    out_dir = Path(args.out)
    print(f"Running eval to {out_dir}")
    run_synthetic_eval(out_dir)
    print("Done")

if __name__ == "__main__":
    main()
