import click

from summit.cli.prompt import prompt_cli


@click.group()
def cli():
    """Summit CLI."""
    pass

cli.add_command(prompt_cli)

if __name__ == "__main__":
    cli()
