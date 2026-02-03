import argparse
import sys
import json
from ..acp.registry_client import fetch_registry_json, parse_agents
from ..acp.installer import plan_install
from ..acp.policy import AcpPolicy

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="summit agents")
    sub = p.add_subparsers(dest="cmd", required=True)

    # list
    list_p = sub.add_parser("list")
    list_p.add_argument("--provider", choices=["acp"], default="acp")

    # install
    install_p = sub.add_parser("install")
    install_p.add_argument("agent_id")

    # use
    use_p = sub.add_parser("use")
    use_p.add_argument("agent_id")

    return p

def run_list(args):
    if args.provider == "acp":
        try:
            doc = fetch_registry_json()
            agents = parse_agents(doc)
            print(f"{'ID':<20} {'NAME':<30} {'VERSION':<10}")
            print("-" * 60)
            for a in agents:
                print(f"{a.id:<20} {a.name:<30} {a.version:<10}")
        except Exception as e:
            print(f"Error fetching registry: {e}", file=sys.stderr)
            return 1
    return 0

def run_install(args):
    agent_id = args.agent_id
    if agent_id.startswith("acp:"):
        agent_id = agent_id[4:]

    try:
        doc = fetch_registry_json()
        agents = parse_agents(doc)
        agent = next((a for a in agents if a.id == agent_id), None)
        if not agent:
            print(f"Agent {agent_id} not found in ACP registry", file=sys.stderr)
            return 1

        policy = AcpPolicy.from_env()
        try:
            plan = plan_install(agent, "linux-x86_64", policy) # hardcoded platform for now
            print(f"Install Plan for {agent.id}:")
            print(f"  Kind: {plan.kind}")
            print(f"  Command: {' '.join(plan.argv)}")
            print(f"  Notes: {', '.join(plan.notes)}")
        except ValueError as ve:
            print(f"Policy Block: {ve}", file=sys.stderr)
            return 1

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    return 0

def run_use(args):
    print(f"Switching to agent {args.agent_id} (not fully implemented)")
    return 0

def main(argv=None) -> int:
    p = build_parser()
    args = p.parse_args(argv)

    if args.cmd == "list":
        return run_list(args)
    elif args.cmd == "install":
        return run_install(args)
    elif args.cmd == "use":
        return run_use(args)

    return 1

if __name__ == "__main__":
    sys.exit(main())
