import argparse
import json
import os
from typing import Dict, Any
from summit.persona.playbook_engine import PlaybookEngine, PersonaHypothesis, CampaignContext, PlatformAccount

# Local DB file for tracking playbook instance states
DB_FILE = os.path.join(os.path.dirname(__file__), ".personas_workbench_db.json")

def load_db() -> Dict[str, Any]:
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r") as f:
            return json.load(f)
    return {}

def save_db(data: Dict[str, Any]):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)

def handle_plan_playbooks(args):
    print("=======================================================================")
    print("Persona Campaign Playbook - Defensive Planning Only - No Automated Engagement")
    print("=======================================================================\n")

    engine = PlaybookEngine()

    # In a real scenario, these would be fetched from a DB.
    # For the workbench, we'll create a synthetic hypothesis based on args
    platforms = [PlatformAccount(platform=p, account_id=p, username=f"{args.persona_id}_{p}") for p in args.platforms] if args.platforms else []

    persona = PersonaHypothesis(
        persona_id=args.persona_id,
        risk_level=args.risk_level,
        deception_profile=args.deception_profile,
        platform_accounts=platforms
    )

    campaign = None
    if args.campaign_id and args.narrative_type:
        campaign = CampaignContext(campaign_id=args.campaign_id, narrative_type=args.narrative_type)

    instances = engine.plan_playbooks_for_persona(persona, campaign)

    if not instances:
        print(f"No matching playbooks found for persona {args.persona_id}.")
        return

    db = load_db()
    for instance in instances:
        if instance.instance_id not in db:
            db[instance.instance_id] = instance.model_dump()
            print(f"Planned Playbook: {instance.name} (ID: {instance.instance_id})")
            print(f"  Urgency: {instance.urgency} | Complexity: {instance.complexity} | Automation Coverage: {instance.automation_coverage:.2f}")
            print(f"  Objectives: {', '.join(instance.objectives)}")
            print("")
        else:
            print(f"Playbook already exists: {instance.instance_id}")

    save_db(db)

def handle_show_playbook(args):
    print("=======================================================================")
    print("Persona Campaign Playbook - Defensive Planning Only - No Automated Engagement")
    print("=======================================================================\n")

    db = load_db()
    if args.instance_id not in db:
        print(f"Playbook instance '{args.instance_id}' not found.")
        return

    instance = db[args.instance_id]
    print(f"Playbook: {instance['name']} (ID: {instance['instance_id']})")
    print(f"Urgency: {instance['urgency']} | Complexity: {instance['complexity']} | Automation Coverage: {instance['automation_coverage']:.2f}\n")

    for phase_name in ["OBSERVE", "ORIENT", "DECIDE", "ACT"]:
        steps = instance["phases"].get(phase_name, [])
        if steps:
            print(f"Phase: {phase_name}")
            for i, step in enumerate(steps, 1):
                badge = f"[{step['step_type']}]"
                deps = f"(Deps: {', '.join(step['dependencies'])})" if step['dependencies'] else ""
                print(f"  {i}. {step['name']} {badge} - {step['status']}")
                if deps:
                    print(f"     {deps}")
            print("")

def handle_update_step_status(args):
    print("=======================================================================")
    print("Persona Campaign Playbook - Defensive Planning Only - No Automated Engagement")
    print("=======================================================================\n")

    db = load_db()
    if args.instance_id not in db:
        print(f"Playbook instance '{args.instance_id}' not found.")
        return

    instance = db[args.instance_id]
    step_found = False

    for phase_name in ["OBSERVE", "ORIENT", "DECIDE", "ACT"]:
        for step in instance["phases"].get(phase_name, []):
            if step["name"] == args.step_name:
                step["status"] = args.status
                step_found = True
                print(f"Updated '{args.step_name}' status to '{args.status}'.")
                break
        if step_found:
            break

    if not step_found:
        print(f"Step '{args.step_name}' not found in instance '{args.instance_id}'.")
    else:
        save_db(db)

def main():
    parser = argparse.ArgumentParser(description="Persona Campaign Playbook Workbench")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # plan-playbooks
    parser_plan = subparsers.add_parser("plan-playbooks", help="Plan defensive playbooks for a persona")
    parser_plan.add_argument("--persona-id", required=True, help="ID of the persona")
    parser_plan.add_argument("--risk-level", default="LOW", help="Risk level (LOW, MEDIUM, HIGH, CRITICAL)")
    parser_plan.add_argument("--deception-profile", default="LOW", help="Deception profile (LOW, MEDIUM, HIGH)")
    parser_plan.add_argument("--platforms", nargs="*", help="List of platforms the persona is on (e.g., linkedin twitter)")
    parser_plan.add_argument("--campaign-id", help="Linked campaign ID")
    parser_plan.add_argument("--narrative-type", help="Campaign narrative type")
    parser_plan.set_defaults(func=handle_plan_playbooks)

    # show-playbook
    parser_show = subparsers.add_parser("show-playbook", help="Show expanded phases and steps of a playbook instance")
    parser_show.add_argument("--instance-id", required=True, help="ID of the playbook instance")
    parser_show.set_defaults(func=handle_show_playbook)

    # update-step-status
    parser_update = subparsers.add_parser("update-step-status", help="Update the status of a specific step")
    parser_update.add_argument("--instance-id", required=True, help="ID of the playbook instance")
    parser_update.add_argument("--step-name", required=True, help="Name of the step to update")
    parser_update.add_argument("--status", required=True, choices=["PLANNED", "IN_PROGRESS", "DONE"], help="New status")
    parser_update.set_defaults(func=handle_update_step_status)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
