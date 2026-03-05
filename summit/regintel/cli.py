import click


@click.group()
def cli():
    """RegIntel CLI"""
    pass

@cli.command()
def run():
    """Run the RegIntel pipeline"""
    click.echo("Running RegIntel pipeline...")

if __name__ == "__main__":
    cli()
