#!/usr/bin/env python3
"""
Summit Pipeline CLI

Unified command-line interface for pipeline operations:
- List all pipelines
- Run pipelines locally or in CI
- Visualize pipeline graphs
- Generate Airflow DAGs
"""
import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from pipelines.registry.core import create_registry, Pipeline


def cmd_list(args):
    """List all pipelines."""
    registry = create_registry()

    # Filter options
    pipelines = registry.list_all()

    if args.runtime:
        pipelines = [p for p in pipelines if p.runtime == args.runtime]

    if args.owner:
        pipelines = [p for p in pipelines if args.owner in p.owners]

    if args.tag:
        key, value = args.tag.split("=", 1)
        pipelines = [p for p in pipelines if p.tags.get(key) == value]

    if args.scheduled:
        pipelines = [p for p in pipelines if p.schedule and p.schedule.get("enabled", True)]

    # Output format
    if args.format == "json":
        output = [
            {
                "name": p.name,
                "description": p.description,
                "owners": p.owners,
                "runtime": p.runtime,
                "schedule": p.schedule.get("cron") if p.schedule else None,
                "tags": p.tags,
                "task_count": len(p.tasks),
            }
            for p in pipelines
        ]
        print(json.dumps(output, indent=2))

    elif args.format == "table":
        # Header
        print(f"{'NAME':<40} {'RUNTIME':<10} {'OWNERS':<30} {'SCHEDULE':<15} {'TASKS':<6}")
        print("=" * 110)

        # Rows
        for p in pipelines:
            name = p.name[:38] + ".." if len(p.name) > 40 else p.name
            owners = ", ".join(p.owners)[:28] + ".." if len(", ".join(p.owners)) > 30 else ", ".join(p.owners)
            schedule = (p.schedule.get("cron", "")[:13] + "..") if p.schedule and len(p.schedule.get("cron", "")) > 15 else (p.schedule.get("cron", "") if p.schedule else "manual")
            tasks = str(len(p.tasks))

            print(f"{name:<40} {p.runtime:<10} {owners:<30} {schedule:<15} {tasks:<6}")

    else:  # compact
        for p in pipelines:
            schedule_str = f" (cron: {p.schedule.get('cron')})" if p.schedule else " (manual)"
            print(f"• {p.name} - {p.runtime} - {len(p.tasks)} tasks{schedule_str}")
            print(f"  {p.description}")
            if p.owners:
                print(f"  Owners: {', '.join(p.owners)}")
            if p.tags:
                tags_str = ", ".join(f"{k}:{v}" for k, v in p.tags.items())
                print(f"  Tags: {tags_str}")
            print()

    # Summary
    if not args.quiet:
        print(f"\n📊 Total: {len(pipelines)} pipelines")
        if not args.runtime:
            by_runtime = {}
            for p in registry.list_all():
                by_runtime[p.runtime] = by_runtime.get(p.runtime, 0) + 1
            print(f"   By runtime: {', '.join(f'{k}={v}' for k, v in sorted(by_runtime.items()))}")

    return 0


def cmd_run(args):
    """Run a pipeline."""
    from pipelines.runners.local_runner import LocalRunner

    registry = create_registry()
    runner = LocalRunner(registry, dry_run=args.dry_run)

    # Parse context
    context = {}
    if args.context:
        context = json.loads(args.context)

    # Execute
    try:
        run = runner.run_pipeline(args.name, context=context, run_id=args.run_id)

        # Output run summary
        if args.format == "json":
            output = {
                "run_id": run.run_id,
                "status": run.status.value,
                "duration_ms": run.duration_ms,
                "succeeded": run.succeeded,
                "tasks": {
                    task_id: {
                        "status": result.status.value,
                        "attempts": result.attempts,
                        "duration_ms": result.duration_ms,
                        "error": result.error,
                    }
                    for task_id, result in run.task_results.items()
                },
            }
            print(json.dumps(output, indent=2))

        return 0 if run.succeeded else 1

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        return 1


def cmd_graph(args):
    """Visualize pipeline graph."""
    registry = create_registry()
    pipeline = registry.get(args.name)

    if not pipeline:
        print(f"❌ Pipeline not found: {args.name}", file=sys.stderr)
        return 1

    if args.format == "mermaid":
        print("```mermaid")
        print("graph TD")

        # Nodes
        for task in pipeline.tasks:
            task_id = task["id"]
            task_name = task.get("name", task_id)
            task_type = task["type"]
            print(f'    {task_id}["{task_name}\\n({task_type})"]')

        # Edges
        for task in pipeline.tasks:
            task_id = task["id"]
            for dep in task.get("depends_on", []):
                print(f"    {dep} --> {task_id}")

        print("```")

    elif args.format == "dot":
        print("digraph pipeline {")
        print('    rankdir=LR;')
        print('    node [shape=box];')

        # Nodes
        for task in pipeline.tasks:
            task_id = task["id"]
            task_name = task.get("name", task_id)
            task_type = task["type"]
            print(f'    {task_id} [label="{task_name}\\n({task_type})"];')

        # Edges
        for task in pipeline.tasks:
            task_id = task["id"]
            for dep in task.get("depends_on", []):
                print(f"    {dep} -> {task_id};")

        print("}")

    elif args.format == "json":
        graph_data = {
            "name": pipeline.name,
            "tasks": [
                {
                    "id": task["id"],
                    "name": task.get("name", task["id"]),
                    "type": task["type"],
                    "depends_on": task.get("depends_on", []),
                }
                for task in pipeline.tasks
            ],
        }
        print(json.dumps(graph_data, indent=2))

    else:  # ascii
        print(f"\n📊 Pipeline: {pipeline.name}")
        print(f"Description: {pipeline.description}\n")

        # Show tasks in execution order
        try:
            task_order = pipeline.topological_sort()
            print("Execution order:")
            for i, task_id in enumerate(task_order, 1):
                task = next(t for t in pipeline.tasks if t["id"] == task_id)
                deps = task.get("depends_on", [])
                deps_str = f" (depends on: {', '.join(deps)})" if deps else ""
                print(f"  {i}. {task_id} ({task['type']}){deps_str}")

        except ValueError as e:
            print(f"❌ Error: {e}")
            return 1

        print(f"\nTotal tasks: {len(pipeline.tasks)}")

    return 0


def cmd_generate_airflow(args):
    """Generate Airflow DAGs from manifests."""
    from pipelines.adaptors.airflow_generator import AirflowDAGGenerator

    registry = create_registry()
    generator = AirflowDAGGenerator(output_dir=Path(args.output_dir))

    if args.pipeline:
        pipeline = registry.get(args.pipeline)
        if not pipeline:
            print(f"❌ Pipeline not found: {args.pipeline}", file=sys.stderr)
            return 1

        generator.generate_single(pipeline)
    else:
        generated = generator.generate_all(registry)
        print(f"\n✅ Generated {len(generated)} Airflow DAGs")

    return 0


def cmd_validate(args):
    """Validate pipeline manifests."""
    registry = create_registry()

    if args.name:
        pipeline = registry.get(args.name)
        if not pipeline:
            print(f"❌ Pipeline not found: {args.name}", file=sys.stderr)
            return 1

        # Validate task graph
        try:
            pipeline.topological_sort()
            print(f"✅ {pipeline.name}: Valid")
            return 0
        except ValueError as e:
            print(f"❌ {pipeline.name}: {e}", file=sys.stderr)
            return 1
    else:
        # Validate all
        errors = 0
        for pipeline in registry.list_all():
            try:
                pipeline.topological_sort()
                print(f"✅ {pipeline.name}: Valid")
            except ValueError as e:
                print(f"❌ {pipeline.name}: {e}", file=sys.stderr)
                errors += 1

        if errors:
            print(f"\n❌ {errors} pipelines have validation errors")
            return 1
        else:
            print(f"\n✅ All {len(registry.list_all())} pipelines are valid")
            return 0


def cmd_info(args):
    """Show detailed pipeline information."""
    registry = create_registry()
    pipeline = registry.get(args.name)

    if not pipeline:
        print(f"❌ Pipeline not found: {args.name}", file=sys.stderr)
        return 1

    if args.format == "json":
        output = {
            "name": pipeline.name,
            "description": pipeline.description,
            "owners": pipeline.owners,
            "tags": pipeline.tags,
            "annotations": pipeline.annotations,
            "runtime": pipeline.runtime,
            "schedule": pipeline.schedule,
            "inputs": pipeline.inputs,
            "outputs": pipeline.outputs,
            "tasks": pipeline.tasks,
            "governance": pipeline.spec.get("governance", {}),
            "observability": pipeline.spec.get("observability", {}),
        }
        print(json.dumps(output, indent=2))
    else:
        print(f"\n📋 Pipeline: {pipeline.name}")
        print(f"Description: {pipeline.description}")
        print(f"Runtime: {pipeline.runtime}")
        print(f"Owners: {', '.join(pipeline.owners)}")

        if pipeline.tags:
            print(f"Tags: {', '.join(f'{k}:{v}' for k, v in pipeline.tags.items())}")

        if pipeline.schedule:
            print(f"Schedule: {pipeline.schedule.get('cron', 'manual')} ({pipeline.schedule.get('timezone', 'UTC')})")

        if pipeline.inputs:
            print(f"\nInputs ({len(pipeline.inputs)}):")
            for inp in pipeline.inputs:
                print(f"  • {inp['name']} ({inp['namespace']})")

        if pipeline.outputs:
            print(f"\nOutputs ({len(pipeline.outputs)}):")
            for out in pipeline.outputs:
                print(f"  • {out['name']} ({out['namespace']})")

        print(f"\nTasks ({len(pipeline.tasks)}):")
        for task in pipeline.tasks:
            deps = task.get("depends_on", [])
            deps_str = f" → depends on: {', '.join(deps)}" if deps else ""
            print(f"  • {task['id']} ({task['type']}){deps_str}")

        # Governance
        governance = pipeline.spec.get("governance", {})
        if governance:
            print(f"\nGovernance:")
            if "budget" in governance:
                budget = governance["budget"]
                print(f"  Budget: ${budget.get('per_run_usd', 'N/A')} per run")
            if "slo" in governance:
                slo = governance["slo"]
                print(f"  SLO: {slo.get('success_rate_percent', 'N/A')}% success rate")

    return 0


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Summit Pipeline CLI - Unified orchestration interface"
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # List command
    list_parser = subparsers.add_parser("list", help="List all pipelines")
    list_parser.add_argument("--runtime", help="Filter by runtime (airflow, maestro, local)")
    list_parser.add_argument("--owner", help="Filter by owner")
    list_parser.add_argument("--tag", help="Filter by tag (format: key=value)")
    list_parser.add_argument("--scheduled", action="store_true", help="Show only scheduled pipelines")
    list_parser.add_argument("--format", choices=["table", "json", "compact"], default="table")
    list_parser.add_argument("--quiet", action="store_true", help="Suppress summary")

    # Run command
    run_parser = subparsers.add_parser("run", help="Run a pipeline")
    run_parser.add_argument("name", help="Pipeline name")
    run_parser.add_argument("--context", help="JSON context parameters")
    run_parser.add_argument("--run-id", help="Custom run ID")
    run_parser.add_argument("--dry-run", action="store_true", help="Dry run (don't execute)")
    run_parser.add_argument("--format", choices=["text", "json"], default="text")

    # Graph command
    graph_parser = subparsers.add_parser("graph", help="Visualize pipeline graph")
    graph_parser.add_argument("name", help="Pipeline name")
    graph_parser.add_argument("--format", choices=["ascii", "mermaid", "dot", "json"], default="ascii")

    # Generate command
    gen_parser = subparsers.add_parser("generate-airflow", help="Generate Airflow DAGs")
    gen_parser.add_argument("--pipeline", help="Generate for specific pipeline")
    gen_parser.add_argument("--output-dir", default="./airflow/dags", help="Output directory")

    # Validate command
    val_parser = subparsers.add_parser("validate", help="Validate pipeline manifests")
    val_parser.add_argument("--name", help="Validate specific pipeline")

    # Info command
    info_parser = subparsers.add_parser("info", help="Show pipeline details")
    info_parser.add_argument("name", help="Pipeline name")
    info_parser.add_argument("--format", choices=["text", "json"], default="text")

    # Parse arguments
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    # Execute command
    commands = {
        "list": cmd_list,
        "run": cmd_run,
        "graph": cmd_graph,
        "generate-airflow": cmd_generate_airflow,
        "validate": cmd_validate,
        "info": cmd_info,
    }

    return commands[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
