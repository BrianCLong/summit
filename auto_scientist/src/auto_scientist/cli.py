# src/auto_scientist/cli.py
from __future__ import annotations
import os
import shutil
from pathlib import Path
from typing import Optional
import importlib.resources

import typer
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table
import yaml

from . import __version__
from .graph import ExperimentGraph
from .storage import FileStorageBackend, StorageError
from .curriculum import Curriculum, CurriculumError
from .planner import LLMPlanner, LLMPlannerConfig, PlannerError
from .runner import ExperimentRunner, RunnerError
from .schemas import Node, NodeType

# --- CLI Setup ---
app = typer.Typer(
    name="auto-scientist",
    help="A framework for orchestrating and automating scientific research with LLM agents.",
    add_completion=False,
)
graph_app = typer.Typer(name="graph", help="Commands for inspecting the Experiment Graph.")
app.add_typer(graph_app)

console = Console()

# --- Project Context ---
class Project:
    """A context object to manage the state of an auto-scientist project."""
    def __init__(self, path: Path):
        self.path = path.resolve()
        if not self.path.is_dir():
            console.print(f"[bold red]Error:[/bold red] Project directory not found at '{self.path}'")
            raise typer.Exit(1)

        self.storage = FileStorageBackend(self.path)
        try:
            self.graph = ExperimentGraph(self.storage)
            self.config = self._load_config()
            self.curriculum = self._load_curriculum()
        except (StorageError, CurriculumError, PlannerError) as e:
            console.print(f"[bold red]Error:[/bold red] {e}")
            raise typer.Exit(1)

    def _load_config(self) -> dict:
        config_path = self.path / "config.yaml"
        if not config_path.exists():
            raise StorageError(f"Config file not found at '{config_path}'")
        with config_path.open("r") as f:
            return yaml.safe_load(f)

    def _load_curriculum(self) -> Curriculum:
        curriculum_path = self.path / self.config.get("curriculum_file", "curriculum.yaml")
        return Curriculum.from_yaml(curriculum_path)

    def save_curriculum_state(self):
        """Saves the current state of the curriculum back to the file."""
        curriculum_path = self.path / self.config.get("curriculum_file", "curriculum.yaml")
        # Note: Pydantic model_dump returns a dict, yaml.dump can handle it
        with curriculum_path.open("w") as f:
            yaml.dump(self.curriculum.model_dump(mode="json"), f, sort_keys=False)

# --- Helper Functions ---
def version_callback(value: bool):
    if value:
        console.print(f"Auto-Scientist version: {__version__}")
        raise typer.Exit()

@app.callback()
def main(version: Optional[bool] = typer.Option(None, "--version", callback=version_callback, is_eager=True)):
    pass

# --- CLI Commands ---

@app.command()
def init(name: str):
    """Initializes a new research project directory."""
    project_path = Path(name)
    console.print(f"Initializing new project at [cyan]{project_path.resolve()}[/cyan]...")

    try:
        # Use importlib.resources to safely access package data
        template_dir = importlib.resources.files('auto_scientist') / 'templates'
        shutil.copytree(template_dir, project_path)
    except Exception as e:
        console.print(f"[bold red]Error copying templates:[/bold red] {e}")
        raise typer.Exit(1)

    # Initialize storage
    storage = FileStorageBackend(project_path)
    try:
        storage.initialize()
    except StorageError as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        raise typer.Exit(1)

    console.print("[bold green]Project initialized successfully![/bold green]")
    console.print(f"\nNext steps:")
    console.print(f"1. `cd {name}`")
    console.print(f"2. Edit `config.yaml` to configure your LLM provider.")
    console.print(f"3. Edit `curriculum.yaml` to define your research plan.")
    console.print(f"4. Implement your training logic in `experiment.py`.")
    console.print(f"5. Run `auto-scientist run` to start the research.")

@app.command()
def run(path: Path = typer.Option(Path("."), "--path", "-p", help="Path to the project directory.")):
    """Runs the main research loop: plan -> run -> advance."""
    project = Project(path)
    console.print(Panel(f"[bold]Starting Auto-Scientist Run[/bold]\nProject: {project.path}", expand=False))

    # Initialize components from config
    planner_config = LLMPlannerConfig(**project.config["planner"])
    planner = LLMPlanner(planner_config)
    runner = ExperimentRunner(project.config["runner"]["train_fn_path"], project.storage)

    max_iterations = project.config.get("max_iterations", 10)

    for i in range(max_iterations):
        if project.curriculum.is_complete and project.curriculum.can_advance(project.graph):
            console.print("[bold green]Curriculum complete and final goals met![/bold green]")
            break

        console.print(f"\n--- Iteration {i+1}/{max_iterations} | Stage: [bold cyan]{project.curriculum.current.name}[/bold cyan] ---")

        # 1. Planner proposes experiments
        try:
            proposals = planner.propose_experiments(
                project.graph, project.curriculum.current, project.config["research_goal"]
            )
        except PlannerError as e:
            console.print(f"[bold red]Planner Error:[/bold red] {e}")
            continue

        if not proposals:
            console.print("[yellow]Planner returned no proposals. Waiting for next iteration.[/yellow]")
            continue

        proposal = proposals[0] # For now, just take the first one
        console.print(f"  -> Planner: Proposing experiment: \"{proposal.description}\"")

        # 2. Runner executes the experiment
        try:
            # Runner needs the raw config dict, not the Pydantic model
            runner.run_experiment(
                project.graph, proposal.config, project.curriculum.current.name, proposal.depends_on
            )
        except RunnerError as e:
            console.print(f"[bold red]Runner Error:[/bold red] {e}")
            continue

        # 3. Curriculum checks for advancement
        if not project.curriculum.is_complete and project.curriculum.can_advance(project.graph):
            project.curriculum.advance()
            project.save_curriculum_state()
            console.print(f"[bold magenta]*** Curriculum advanced to stage: {project.curriculum.current.name} ***[/bold magenta]")

    console.print(Panel("[bold]Run Finished[/bold]", expand=False))

@graph_app.command("show")
def graph_show(path: Path = typer.Option(Path("."), "--path", "-p", help="Path to the project directory.")):
    """Displays a summary of the current experiment graph."""
    project = Project(path)
    graph = project.graph
    console.print(Panel(f"[bold]Experiment Graph Summary[/bold]\nNodes: {len(graph.nodes)} | Edges: {len(graph.edges)}", expand=False))

    table = Table(title="Nodes by Type")
    table.add_column("Node Type", style="cyan")
    table.add_column("Count", style="magenta")

    for node_type in NodeType:
        count = len(list(graph.nodes_by_type(node_type)))
        table.add_row(node_type.value, str(count))

    console.print(table)

@graph_app.command("viz")
def graph_viz(
    path: Path = typer.Option(Path("."), "--path", "-p", help="Path to the project directory."),
    output_file: Path = typer.Option("graph.png", "--output-file", "-o", help="Path to save the visualization."),
):
    """Generates a visualization of the Experiment DAG (requires Graphviz)."""
    project = Project(path)
    try:
        from graphviz import Digraph
    except ImportError:
        console.print("[bold red]Error:[/bold red] `graphviz` is not installed. Please run `pip install auto-scientist[viz]`.")
        raise typer.Exit(1)

    dot = Digraph(comment='Experiment DAG')
    dot.attr('graph', rankdir='TB', splines='ortho')
    dot.attr('node', shape='box', style='rounded,filled', fillcolor='lightblue')
    dot.attr('edge', color='gray40')

    for node in project.graph.nodes.values():
        label = f"**{node.type.value}**\n{node.id}\n*Stage: {node.stage}*"
        if node.type == NodeType.EVAL:
            metrics = node.payload.get('metrics', {})
            metrics_str = "\n".join(f"{k}: {v:.4f}" for k, v in metrics.items())
            label += f"\n---\n{metrics_str}"
        dot.node(str(node.id), label)

    for edge in project.graph.edges:
        dot.edge(str(edge.source), str(edge.target), label=edge.type.value)

    try:
        # Render needs filename without extension
        output_path_stem = output_file.stem
        output_format = output_file.suffix.lstrip('.')
        dot.render(output_path_stem, format=output_format, cleanup=True, view=False)
        # Rename to the full user-specified filename
        rendered_file = Path(f"{output_path_stem}.{output_format}")
        if rendered_file.exists() and str(rendered_file) != str(output_file):
            shutil.move(rendered_file, output_file)
        console.print(f"[bold green]Graph visualization saved to {output_file}[/bold green]")
    except Exception as e:
        console.print(f"[bold red]Error rendering graph:[/bold red] {e}")
        console.print("Please ensure Graphviz is installed and in your system's PATH (https://graphviz.org/download/).")

if __name__ == "__main__":
    app()
