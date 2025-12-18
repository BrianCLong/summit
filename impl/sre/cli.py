import click
import json
from pathlib import Path
from rich.console import Console
from rich.table import Table
from .schema import load_episode
from .metrics import TraceLengthMetric, ToolEfficiencyMetric, ExactMatchMetric

console = Console()

@click.group()
def main():
    """Summit Reasoning Evaluator (SRE) CLI"""
    pass

@main.command()
@click.option("--trace", type=click.Path(exists=True), help="Path to episode trace JSON/JSONL")
@click.option("--metrics", default="trace_length,tool_efficiency", help="Comma-separated metrics")
def eval(trace, metrics):
    """Evaluate a single trace file."""
    try:
        episode = load_episode(trace)

        metric_map = {
            "trace_length": TraceLengthMetric(),
            "tool_efficiency": ToolEfficiencyMetric(),
            "exact_match": ExactMatchMetric()
        }

        results = {}
        selected_metrics = metrics.split(",")

        for m_name in selected_metrics:
            if m_name in metric_map:
                results[m_name] = metric_map[m_name].compute(episode)
            else:
                console.print(f"[yellow]Warning: Metric '{m_name}' not found.[/yellow]")

        table = Table(title=f"Evaluation Results: {episode.episode_id}")
        table.add_column("Metric", style="cyan")
        table.add_column("Score", style="magenta")

        for k, v in results.items():
            table.add_row(k, str(v))

        console.print(table)

    except Exception as e:
        console.print(f"[red]Error processing trace: {e}[/red]")

@main.command()
@click.option("--suite", default="demo", help="Suite name to run")
def run(suite):
    """Run a demo evaluation suite."""
    console.print(f"[bold green]Running suite: {suite}[/bold green]")

    # Mock data for demo
    mock_episode_data = {
        "episode_id": "demo-run-001",
        "task_id": "math-001",
        "run_config": {"expected_answer": "42"},
        "outcome": "42",
        "graph": {
            "nodes": [
                {"id": "1", "type": "thought", "content": "I need to calculate 6 * 7"},
                {"id": "2", "type": "call", "content": "calc(6*7)", "metadata": {"tool_name": "calculator"}},
                {"id": "3", "type": "observation", "content": "42"},
                {"id": "4", "type": "thought", "content": "The answer is 42"}
            ],
            "edges": [
                {"source": "1", "target": "2"},
                {"source": "2", "target": "3"},
                {"source": "3", "target": "4"}
            ]
        }
    }

    # Save mock to temp file
    temp_path = Path("demo_trace.json")
    with open(temp_path, "w") as f:
        json.dump(mock_episode_data, f)

    # Reuse eval logic
    ctx = click.get_current_context()
    ctx.invoke(eval, trace=str(temp_path), metrics="trace_length,tool_efficiency,exact_match")

    # Cleanup
    if temp_path.exists():
        temp_path.unlink()

if __name__ == "__main__":
    main()
