import argparse
import sys
import os
from summit.flags import SUMMIT_FEATURE_IP_CAPTURE
from summit.pipelines.ip_capture.pipeline import run_ip_capture

def main(argv=None):
    if argv is None:
        argv = sys.argv[1:]

    parser = argparse.ArgumentParser(description="Summit IP Capture CLI")
    parser.add_argument("--input", required=True, help="Path to input markdown file")
    parser.add_argument("--out", required=True, help="Directory for output artifacts")

    args = parser.parse_args(argv)

    if not SUMMIT_FEATURE_IP_CAPTURE:
        print("Error: Feature SUMMIT_FEATURE_IP_CAPTURE is disabled.", file=sys.stderr)
        return 1

    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found.", file=sys.stderr)
        return 1

    try:
        run_ip_capture(args.input, args.out)
        print(f"Success. Artifacts written to {args.out}")
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
