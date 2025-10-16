from datetime import datetime, timedelta

from airflow.operators.python import PythonOperator

from airflow import DAG


def build_index(ds, **kwargs):
    # idempotent: write to s3://indexes/tmp/<run_id>/ then atomically promote
    pass


def promote_index(ds, **kwargs):
    # atomically swap manifest pointer
    pass


def sla_miss_callback(dag, task_list, blocking_task_list, slas, blocking_tis):
    print("SLA MISS", task_list)


dag = DAG(
    "search_offline",
    start_date=datetime(2025, 1, 1),
    schedule="0 2 * * *",
    catchup=False,
    default_args={"retries": 3, "retry_delay": timedelta(minutes=10), "sla": timedelta(hours=2)},
    sla_miss_callback=sla_miss_callback,
)

build = PythonOperator(task_id="build", python_callable=build_index, dag=dag)
promote = PythonOperator(task_id="promote", python_callable=promote_index, dag=dag)
build >> promote
