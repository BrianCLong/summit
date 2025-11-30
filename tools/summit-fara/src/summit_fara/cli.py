import click
import logging
from rich.console import Console
from rich.logging import RichHandler
from .agent.co_evolution import CoEvolutionLoop
from .env.intelgraph import IntelGraphConnector

# Configure logging
logging.basicConfig(
    level="INFO",
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(rich_tracebacks=True)]
)
log = logging.getLogger("summit-fara")
console = Console()

@click.command()
@click.option('--task', required=True, help='The task description or "Evolve ..." command.')
@click.option('--endpoint', default='summit_llm.json', help='Path to LLM endpoint config.')
@click.option('--max_rounds', default=50, type=int, help='Maximum co-evolution rounds.')
@click.option('--intelgraph', is_flag=True, help='Enable IntelGraph integration.')
def main(task, endpoint, max_rounds, intelgraph):
    """
    SummitFara CLI: Autonomous Computer-Use Agent for Summit.

    Deploys the Co-Evolution Loop for SummitFara agents.
    """
    console.rule("[bold blue]SummitFara Initialization[/]")
    log.info(f"Task: {task}")
    log.info(f"Endpoint: {endpoint}")
    log.info(f"Max Rounds: {max_rounds}")
    log.info(f"IntelGraph Enabled: {intelgraph}")

    if intelgraph:
        ig_connector = IntelGraphConnector()
        if not ig_connector.check_connection():
            log.warning("IntelGraph connection failed. Proceeding without graph capabilities.")
        else:
            log.info("IntelGraph connected successfully.")

    # Initialize Co-Evolution Loop
    loop = CoEvolutionLoop(
        endpoint_config=endpoint,
        max_rounds=max_rounds,
        use_intelgraph=intelgraph
    )

    if "Evolve" in task:
        console.print("[bold green]Starting Co-Evolution Cycle...[/]")
        loop.run_evolution()
    else:
        console.print(f"[bold green]Executing single task: {task}[/]")
        loop.execute_task(task)

if __name__ == '__main__':
    main()
