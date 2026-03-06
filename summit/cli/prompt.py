import json
from pathlib import Path
from typing import List

import click

from summit.eval.prompt_eval.runner import run_eval
from summit.prompts.lint import lint_prompt
from summit.prompts.load import load_prompt_artifact
from summit.prompts.validate import validate_prompt_artifact


@click.group(name="prompt")
def prompt_cli():
    """Prompt engineering tools."""
    pass

@prompt_cli.command(name="lint")
@click.argument("paths", nargs=-1, type=click.Path(exists=True, dir_okay=True))
def lint_command(paths: list[str]):
    """Lint prompt artifacts."""
    files = []
    for p in paths:
        path = Path(p)
        if path.is_dir():
            files.extend(path.glob("**/*.prompt.yaml"))
        elif path.name.endswith(".prompt.yaml"):
            files.append(path)

    if not files:
        click.echo("No .prompt.yaml files found.")
        return

    has_errors = False
    for f in files:
        click.echo(f"Checking {f}...")
        try:
            data = load_prompt_artifact(f)

            # Schema Validation
            validation_errors = validate_prompt_artifact(data)
            if validation_errors:
                has_errors = True
                click.echo("  Schema Errors:")
                for e in validation_errors:
                    click.echo(f"    - {e}")

            # Linting
            lint_errors = lint_prompt(data)
            if lint_errors:
                has_errors = True
                click.echo("  Lint Errors:")
                for e in lint_errors:
                    click.echo(f"    - {e}")

            if not validation_errors and not lint_errors:
                click.echo("  OK")

        except Exception as e:
            has_errors = True
            click.echo(f"  Failed to load/process: {e}")

    if has_errors:
        raise click.Abort()
    else:
        click.echo("All checks passed.")

@prompt_cli.command(name="eval")
@click.argument("prompt_path", type=click.Path(exists=True))
@click.option("--fixtures", type=click.Path(exists=True), required=True, help="Path to .jsonl fixtures")
def eval_command(prompt_path: str, fixtures: str):
    """Evaluate a prompt against fixtures."""
    try:
        prompt_data = load_prompt_artifact(prompt_path)

        fixtures_data = []
        with open(fixtures) as f:
            for line in f:
                if line.strip():
                    fixtures_data.append(json.loads(line))

        click.echo(f"Running eval for {prompt_path} with {len(fixtures_data)} fixtures...")

        result = run_eval(prompt_data, fixtures_data)

        click.echo(f"Score: {result['score']}")
        click.echo("Outputs:")
        for out in result['outputs']:
            click.echo(f"  - {out}")

    except Exception as e:
        click.echo(f"Eval failed: {e}")
        raise click.Abort()

if __name__ == "__main__":
    prompt_cli()
