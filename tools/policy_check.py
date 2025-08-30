#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
import tempfile


def check_policy(env: str, loa: int, hosted: int):
    input_data = {
        "input": {
            "env": env,
            "loa": loa,
            "hosted": hosted,
            "kill_switch": 0,  # Assuming kill_switch is 0 for now, will be loaded from orchestration.yml later
        }
    }

    input_json = json.dumps(input_data)

    temp_input_file = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", delete=False) as temp_file:
            temp_file.write(input_json)
            temp_input_file = temp_file.name

        # Get absolute path to policy file
        policy_file_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "policy", "loa.rego"
        )

        cmd = ["opa", "eval", "-d", policy_file_path, "-i", temp_input_file, "data.orchestra.allow"]

        process = subprocess.run(cmd, capture_output=True, check=True)

        opa_output = process.stdout.decode("utf-8").strip()
        print(f"OPA Raw Output: {opa_output}", file=sys.stderr)  # Debug print to stderr

        try:
            opa_json = json.loads(opa_output)
            # Extract the boolean value from the OPA JSON output
            result = opa_json["result"][0]["expressions"][0]["value"]
        except (json.JSONDecodeError, KeyError):
            print(f"Error parsing OPA output: {opa_output}", file=sys.stderr)
            sys.exit(1)

        if result is True:  # Check for boolean True
            print("Policy check: ALLOWED", file=sys.stderr)  # Print to stderr
            return True
        else:
            print("Policy check: BLOCKED", file=sys.stderr)  # Print to stderr
            return False

    except subprocess.CalledProcessError as e:
        print(f"Error running OPA: {e.stderr.decode('utf-8')}", file=sys.stderr)
        return False
    except FileNotFoundError:
        print(
            "Error: 'opa' command not found. Please install OPA (Open Policy Agent).",
            file=sys.stderr,
        )
        return False
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        return False
    finally:
        if temp_input_file and os.path.exists(temp_input_file):
            os.remove(temp_input_file)


def main():
    parser = argparse.ArgumentParser(description="Check policy against OPA.")
    parser.add_argument("--env", required=True, help="Environment (e.g., 'dev', 'prod')")
    parser.add_argument("--loa", type=int, required=True, help="Level of Autonomy (0-3)")
    parser.add_argument(
        "--hosted",
        type=int,
        choices=[0, 1],
        required=True,
        help="Is hosted model (0=false, 1=true)",
    )

    args = parser.parse_args()

    if check_policy(args.env, args.loa, args.hosted):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
