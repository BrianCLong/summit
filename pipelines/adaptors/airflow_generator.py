"""
Airflow DAG Generator

Converts unified pipeline manifests into Airflow DAG definitions.
"""
import textwrap
from datetime import timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from pipelines.registry.core import Pipeline, PipelineRegistry


class AirflowDAGGenerator:
    """
    Generates Airflow DAG Python files from pipeline manifests.
    """

    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def parse_duration_to_timedelta(self, duration_str: str) -> str:
        """
        Parse duration string to Python timedelta expression.
        Example: '5m' -> 'timedelta(minutes=5)'
        """
        if not duration_str:
            return "timedelta(minutes=5)"

        unit = duration_str[-1]
        value = duration_str[:-1]

        if unit == "s":
            return f"timedelta(seconds={value})"
        elif unit == "m":
            return f"timedelta(minutes={value})"
        elif unit == "h":
            return f"timedelta(hours={value})"
        else:
            return "timedelta(minutes=5)"

    def generate_task_code(self, task: Dict[str, Any], pipeline_name: str) -> str:
        """Generate Airflow task code for a single task."""
        task_id = task["id"]
        task_type = task["type"]
        task_name = task.get("name", task_id)

        # Retry configuration
        retry_config = task.get("retry", {})
        retries = retry_config.get("attempts", 3)
        retry_delay_str = retry_config.get("delay", "5m")
        retry_delay = self.parse_duration_to_timedelta(retry_delay_str)

        # Timeout
        timeout_str = task.get("timeout", "30m")
        execution_timeout = self.parse_duration_to_timedelta(timeout_str)

        # Dependencies
        depends_on = task.get("depends_on", [])

        # Generate operator based on type
        if task_type == "python":
            code_config = task.get("code", {})
            module = code_config.get("module", "")
            function = code_config.get("function", "")
            params = task.get("params", {})

            task_code = f"""
    {task_id} = PythonOperator(
        task_id='{task_id}',
        python_callable=lambda **context: exec_python_task(
            module='{module}',
            function='{function}',
            params={params},
            context=context
        ),
        retries={retries},
        retry_delay={retry_delay},
        execution_timeout={execution_timeout},
        dag=dag,
    )
"""

        elif task_type == "bash":
            code_config = task.get("code", {})
            command = code_config.get("command", "")
            env = task.get("env", {})

            # Escape quotes in command
            command = command.replace("'", "\\'")

            task_code = f"""
    {task_id} = BashOperator(
        task_id='{task_id}',
        bash_command='{command}',
        env={env},
        retries={retries},
        retry_delay={retry_delay},
        execution_timeout={execution_timeout},
        dag=dag,
    )
"""

        elif task_type == "docker":
            code_config = task.get("code", {})
            image = code_config.get("image", "")
            command = code_config.get("command", "")
            env = task.get("env", {})

            task_code = f"""
    {task_id} = DockerOperator(
        task_id='{task_id}',
        image='{image}',
        command='{command}',
        environment={env},
        retries={retries},
        retry_delay={retry_delay},
        execution_timeout={execution_timeout},
        dag=dag,
    )
"""

        else:
            # Default to PythonOperator with placeholder
            task_code = f"""
    {task_id} = PythonOperator(
        task_id='{task_id}',
        python_callable=lambda: print('Task {task_id} - type {task_type} not fully implemented'),
        retries={retries},
        retry_delay={retry_delay},
        execution_timeout={execution_timeout},
        dag=dag,
    )
"""

        return task_code

    def generate_dependencies(self, pipeline: Pipeline) -> str:
        """Generate task dependency declarations."""
        graph = pipeline.task_graph
        dependencies = []

        for task_id, deps in graph.items():
            if deps:
                for dep in deps:
                    dependencies.append(f"    {dep} >> {task_id}")

        return "\n".join(dependencies) if dependencies else "    # No dependencies"

    def generate_dag(self, pipeline: Pipeline) -> str:
        """Generate complete Airflow DAG Python code."""
        # Extract metadata
        dag_id = pipeline.name
        description = pipeline.description
        owners = ", ".join(pipeline.owners)
        tags_list = [f"{k}:{v}" for k, v in pipeline.tags.items()]

        # Schedule
        schedule = pipeline.schedule
        schedule_interval = f"'{schedule.get('cron')}'" if schedule and schedule.get("cron") else "None"
        catchup = pipeline.spec.get("execution", {}).get("catchup", False)

        # Generate imports
        imports = """
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.operators.docker_operator import DockerOperator
import importlib

"""

        # Generate helper functions
        helpers = """
def exec_python_task(module: str, function: str, params: dict, context: dict):
    \"\"\"Execute a Python task by importing module and calling function.\"\"\"
    mod = importlib.import_module(module)
    func = getattr(mod, function)
    merged_params = {**context, **params}
    return func(**merged_params)

"""

        # Generate DAG definition
        dag_def = f"""
# DAG: {dag_id}
# Generated from pipeline manifest
# Description: {description}
# Owners: {owners}

default_args = {{
    'owner': '{owners.split(",")[0].strip() if owners else "airflow"}',
    'depends_on_past': False,
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}}

dag = DAG(
    dag_id='{dag_id}',
    default_args=default_args,
    description='{description}',
    schedule_interval={schedule_interval},
    start_date=datetime(2025, 1, 1),
    catchup={catchup},
    tags={tags_list},
)

with dag:
"""

        # Generate tasks
        task_codes = []
        for task in pipeline.tasks:
            task_code = self.generate_task_code(task, dag_id)
            task_codes.append(task_code)

        tasks_section = "\n".join(task_codes)

        # Generate dependencies
        deps_section = self.generate_dependencies(pipeline)

        # Combine all sections
        full_dag = f"""{imports}{helpers}{dag_def}{tasks_section}
    # Task dependencies
{deps_section}
"""

        return full_dag

    def generate_all(self, registry: PipelineRegistry) -> Dict[str, Path]:
        """
        Generate Airflow DAGs for all pipelines in registry.

        Returns:
            Dict mapping pipeline name to generated DAG file path
        """
        generated = {}

        for pipeline in registry.list_all():
            # Only generate for pipelines targeting Airflow
            if pipeline.runtime != "airflow":
                continue

            # Generate DAG code
            dag_code = self.generate_dag(pipeline)

            # Write to file
            output_file = self.output_dir / f"{pipeline.name}.py"
            with open(output_file, "w") as f:
                f.write(dag_code)

            generated[pipeline.name] = output_file
            print(f"✅ Generated Airflow DAG: {output_file}")

        return generated

    def generate_single(self, pipeline: Pipeline) -> Path:
        """Generate Airflow DAG for a single pipeline."""
        dag_code = self.generate_dag(pipeline)
        output_file = self.output_dir / f"{pipeline.name}.py"

        with open(output_file, "w") as f:
            f.write(dag_code)

        print(f"✅ Generated Airflow DAG: {output_file}")
        return output_file


def main():
    """CLI entry point for DAG generator."""
    import argparse
    from pipelines.registry.core import create_registry

    parser = argparse.ArgumentParser(description="Generate Airflow DAGs from pipeline manifests")
    parser.add_argument("--output-dir", default="./airflow/dags", help="Output directory for DAG files")
    parser.add_argument("--pipeline", help="Generate DAG for specific pipeline only")
    parser.add_argument("--manifest-dir", help="Pipeline manifest directory")

    args = parser.parse_args()

    # Create registry
    manifest_dirs = [args.manifest_dir] if args.manifest_dir else None
    registry = create_registry(manifest_dirs=manifest_dirs)

    # Create generator
    generator = AirflowDAGGenerator(output_dir=Path(args.output_dir))

    # Generate
    if args.pipeline:
        pipeline = registry.get(args.pipeline)
        if not pipeline:
            print(f"❌ Pipeline not found: {args.pipeline}")
            return 1

        generator.generate_single(pipeline)
    else:
        generated = generator.generate_all(registry)
        print(f"\n✅ Generated {len(generated)} Airflow DAGs")

    return 0


if __name__ == "__main__":
    exit(main())
