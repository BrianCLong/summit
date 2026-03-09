import click

from summit.workflow.base import WorkflowValidator


@click.group()
def workflow():
    """Workflow orchestration and validation."""
    pass

@workflow.command()
@click.argument('path')
@click.option('--adapter', type=click.Choice(['dbt', 'airflow']), required=True)
@click.option('--run-id', help='Unique run identifier')
def validate(path, adapter, run_id):
    """Validates a dbt or Airflow workflow."""
    validator = WorkflowValidator(run_id=run_id)
    report = validator.validate(path, adapter)
    click.echo(f"Validation successful. Evidence ID: {report['evidence_id']}")

if __name__ == '__main__':
    workflow()
