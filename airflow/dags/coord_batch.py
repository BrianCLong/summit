from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from connectors import twitter, youtube, reddit, telegram, tiktok, rss
from jobs import normalize, similarity, score, louvain, case_trigger, followers_cusum, youtube_enrich, narratives, persona_drift, laundering_chains, campaign_metrics, cutout_detector, hybridization_detector, anomaly_fusion
import requests # For calling sim service

default_args = {"owner":"intelgraph","retries":1,"retry_delay":timedelta(minutes=5)}
with DAG("coord_batch", start_date=datetime(2025,9,1), schedule="0 2 * * *",
         default_args=default_args, catchup=False) as dag:
    pull = PythonOperator(task_id="pull_all", python_callable=lambda: [
      twitter.backfill(0), youtube.backfill(0), reddit.backfill(0), telegram.backfill(0), tiktok.backfill(0), rss.backfill(0)
    ])
    sim_history = PythonOperator(task_id="generate_sim_history", python_callable=lambda: requests.post("http://sim:9300/generate_history", json={"days": 7, "source": "SIM"}).json())
    norm = PythonOperator(task_id="normalize", python_callable=normalize.run)
    enrich_yt = PythonOperator(task_id="youtube_enrich", python_callable=youtube_enrich.run)
    sim  = PythonOperator(task_id="similarity_edges", python_callable=similarity.run_yesterday)
    sc   = PythonOperator(task_id="coordination_score", python_callable=score.run)
    comm = PythonOperator(task_id="communities", python_callable=louvain.run)
    anom = PythonOperator(task_id="followers_cusum", python_callable=followers_cusum.run)
    drift = PythonOperator(task_id="persona_drift", python_callable=persona_drift.run)
    fusion = PythonOperator(task_id="anomaly_fusion", python_callable=anomaly_fusion.run)
    narr = PythonOperator(task_id="narratives_v1", python_callable=lambda: narratives.run(7,15))
    launder = PythonOperator(task_id="laundering_chains", python_callable=laundering_chains.run)
    campaign = PythonOperator(task_id="campaign_metrics", python_callable=campaign_metrics.run)
    cutout = PythonOperator(task_id="cutout_detector", python_callable=cutout_detector.run)
    hybrid = PythonOperator(task_id="hybridization_detector", python_callable=hybridization_detector.run)
    trig = PythonOperator(task_id="case_trigger", python_callable=case_trigger.run)
    pull >> sim_history >> norm >> enrich_yt >> sim >> sc >> comm >> anom >> drift >> fusion >> narr >> launder >> campaign >> cutout >> hybrid >> trig