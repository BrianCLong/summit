FROM python:3.11-slim

WORKDIR /app

COPY services/context-pruner/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY services/context-pruner/src /app/src

EXPOSE 8090

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8090"]
