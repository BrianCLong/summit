from celery import Celery

app = Celery('worker', broker='redis://localhost:6379/0')

@app.task
def ping():
    return 'pong'
