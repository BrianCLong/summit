# Apache Airflow Infrastructure

This directory contains the Docker Compose setup for running Apache Airflow as part of the IntelGraph Data Integration Platform.

## Quick Start

```bash
# Copy environment file
cp .env.example .env

# Edit .env and set your credentials
nano .env

# Create required directories
mkdir -p ./dags ./logs ./plugins ./config

# Set proper permissions
echo -e "AIRFLOW_UID=$(id -u)" > .env

# Start Airflow
docker-compose up -d

# Access Airflow Web UI
# http://localhost:8080
# Default credentials: admin/admin
```

## Architecture

The setup includes:

- **Airflow Webserver**: Web UI on port 8080
- **Airflow Scheduler**: DAG scheduling and task execution
- **Airflow Worker**: Celery workers for distributed task execution
- **Airflow Triggerer**: Handles deferred tasks
- **PostgreSQL**: Metadata database
- **Redis**: Message broker for Celery
- **Flower**: Celery monitoring on port 5555

## Directory Structure

```
infrastructure/airflow/
├── docker-compose.yml      # Docker Compose configuration
├── .env                    # Environment variables
├── .env.example           # Environment template
├── dags/                  # Airflow DAGs
│   └── etl_pipeline_example.py
├── logs/                  # Airflow logs
├── plugins/               # Airflow plugins
└── config/                # Airflow configuration
```

## Managing DAGs

Place your DAG files in the `dags/` directory. Airflow will automatically detect and load them.

Example DAG structure:

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    'owner': 'intelgraph',
    'start_date': datetime(2025, 1, 1),
    'retries': 3,
    'retry_delay': timedelta(minutes=5)
}

dag = DAG(
    'my_etl_pipeline',
    default_args=default_args,
    schedule_interval='@daily',
    catchup=False
)

# Define tasks...
```

## Monitoring

### Airflow Web UI
- URL: http://localhost:8080
- View DAG runs, task status, logs, and metrics

### Flower (Celery Monitoring)
- URL: http://localhost:5555
- Monitor Celery workers and tasks

## Scaling

### Increase Workers

Edit `docker-compose.yml` and add more worker services:

```yaml
airflow-worker-2:
  <<: *airflow-common
  command: celery worker
  # ... (same config as airflow-worker)
```

### Resource Limits

Add resource constraints:

```yaml
airflow-worker:
  # ...
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
```

## Production Configuration

### Security

1. Change default credentials in `.env`
2. Generate Fernet key:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
3. Set `AIRFLOW__CORE__FERNET_KEY` in `.env`

### High Availability

1. Use external PostgreSQL and Redis
2. Deploy multiple webserver and scheduler instances
3. Use load balancer for webserver

### Monitoring & Alerting

Configure email notifications in `.env`:

```bash
AIRFLOW__SMTP__SMTP_HOST=smtp.gmail.com
AIRFLOW__SMTP__SMTP_PORT=587
AIRFLOW__SMTP__SMTP_USER=your-email@gmail.com
AIRFLOW__SMTP__SMTP_PASSWORD=your-app-password
```

## Troubleshooting

### Check service status
```bash
docker-compose ps
```

### View logs
```bash
docker-compose logs -f airflow-webserver
docker-compose logs -f airflow-scheduler
docker-compose logs -f airflow-worker
```

### Restart services
```bash
docker-compose restart
```

### Reset database
```bash
docker-compose down -v
docker-compose up -d
```

## CLI Commands

Access Airflow CLI:

```bash
# List DAGs
docker-compose run airflow-cli airflow dags list

# Trigger DAG
docker-compose run airflow-cli airflow dags trigger my_dag

# Test task
docker-compose run airflow-cli airflow tasks test my_dag my_task 2025-01-01
```

## License

MIT
