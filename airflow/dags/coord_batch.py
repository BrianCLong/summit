from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from connectors import twitter, youtube, reddit, telegram, tiktok, rss
from jobs import normalize, similarity, score, louvain, case_trigger, followers_cusum, youtube_enrich

default_args = {"owner":"intelgraph","retries":1,"retry_delay":timedelta(minutes=5)}
with DAG("coord_batch", start_date=datetime(2025,9,1), schedule="0 2 * * *",
         default_args=default_args, catchup=False) as dag:
    pull = PythonOperator(task_id="pull_all", python_callable=lambda: [
      twitter.backfill(0), youtube.backfill(0), reddit.backfill(0), telegram.backfill(0), tiktok.backfill(0), rss.backfill(0)
    ])
    norm = PythonOperator(task_id="normalize", python_callable=normalize.run)
    enrich_yt = PythonOperator(task_id="youtube_enrich", python_callable=youtube_enrich.run)
    sim  = PythonOperator(task_id="similarity_edges", python_callable=similarity.run_yesterday)
    sc   = PythonOperator(task_id="coordination_score", python_callable=score.run)
    comm = PythonOperator(task_id="communities", python_callable=louvain.run)
    anom = PythonOperator(task_id="followers_cusum", python_callable=followers_cusum.run)
    trig = PythonOperator(task_id="case_trigger", python_callable=case_trigger.run)
    pull >> norm >> enrich_yt >> sim >> sc >> comm >> anom >> trig