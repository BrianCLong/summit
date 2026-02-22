import sys
from summit.cli.ip_capture import main as ip_capture_main
from summit.cli.automation_verify import main as verify_main

def main():
    if len(sys.argv) < 2:
        print("Usage: python -m summit.cli <command> [args...]", file=sys.stderr)
        print("Commands: ip-capture, automation-verify", file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1]
    rest_args = sys.argv[2:]

    if command == "ip-capture":
        # Pass only the arguments relevant to the subcommand
        # ip_capture.main handles its own parsing
        sys.exit(ip_capture_main(rest_args))
    elif command == "automation-verify":
        # automation_verify expects argv[0] to be the script name and argv[1] the arg
        # So we reconstruct a valid argv
        sys.exit(verify_main(["automation-verify"] + rest_args))
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
