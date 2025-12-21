FROM python:3.11-slim

ARG DEFAULT_PORT=8106
ARG DEFAULT_SERVICE_NAME=disclosure-wallets

ENV PYTHONUNBUFFERED=1 \
    SERVICE_NAME=${DEFAULT_SERVICE_NAME} \
    PORT=${DEFAULT_PORT}

WORKDIR /app
COPY services/stub_runtime /app/stub_runtime

EXPOSE ${DEFAULT_PORT}

CMD ["python", "/app/stub_runtime/app.py"]
