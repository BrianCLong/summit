FROM python:3.11-slim-buster
WORKDIR /app
COPY services/faust/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/faust/ .
CMD ["faust", "-A", "app", "worker", "-l", "info"]