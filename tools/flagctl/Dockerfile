FROM python:3.11-slim
WORKDIR /app
COPY flags /app/flags
COPY tools/flagctl /app/tools/flagctl
ENTRYPOINT ["python", "tools/flagctl/flagctl.py"]
