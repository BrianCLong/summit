import click
import os
import sys
from .linter import Linter

@click.command()
@click.option('--repo', default='.', help='Path to repository root')
def main(repo):
    """Lint all prompt packs in prompts/packs/."""
    try:
        linter = Linter(repo)
    except FileNotFoundError as e:
        click.echo(f"Error: {e}")
        sys.exit(1)

    packs_dir = os.path.join(repo, "prompts", "packs")
    if not os.path.exists(packs_dir):
        click.echo(f"No prompts/packs directory found at {packs_dir}")
        sys.exit(0)

    has_errors = False
    for pack_id in os.listdir(packs_dir):
        pack_path = os.path.join(packs_dir, pack_id)
        if not os.path.isdir(pack_path):
            continue

        click.echo(f"Linting {pack_id}...", nl=False)
        errors = linter.lint_pack(pack_path)
        if errors:
            click.echo(" FAILED")
            for err in errors:
                click.echo(f"  - {err}")
            has_errors = True
        else:
            click.echo(" PASS")

    if has_errors:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
