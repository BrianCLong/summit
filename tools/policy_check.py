#!/usr/bin/env python3
import argparse
import subprocess
import sys
import json

def check_policy(env: str, loa: int, hosted: int):
    input_data = {
        "input": {
            "env": env,
            "loa": loa,
            "hosted": hosted,
            "kill_switch": 0 # Assuming kill_switch is 0 for now, will be loaded from orchestration.yml later
        }
    }
    
    # Convert input_data to JSON string
    input_json = json.dumps(input_data)
    
    try:
        # Execute OPA eval command
        # Assuming 'opa' is in PATH and 'policy/loa.rego' is accessible
        cmd = ["opa", "eval", "-d", "policy/loa.rego", "-i", "-", "data.orchestra.allow"]
        
        process = subprocess.run(cmd, input=input_json, capture_output=True, text=True, check=True)
        
        # OPA eval returns 'true' or 'false' as a string
        result = process.stdout.strip().lower()
        
        if result == "true":
            print("Policy check: ALLOWED")
            sys.exit(0)
        else:
            print("Policy check: BLOCKED")
            sys.exit(1)
            
    except subprocess.CalledProcessError as e:
        print(f"Error running OPA: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print("Error: 'opa' command not found. Please install OPA (Open Policy Agent).")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Check policy against OPA.")
    parser.add_argument("--env", required=True, help="Environment (e.g., 'dev', 'prod')")
    parser.add_argument("--loa", type=int, required=True, help="Level of Autonomy (0-3)")
    parser.add_argument("--hosted", type=int, choices=[0, 1], required=True, help="Is hosted model (0=false, 1=true)")
    
    args = parser.parse_args()
    
    check_policy(args.env, args.loa, args.hosted)

if __name__ == "__main__":
    main()
