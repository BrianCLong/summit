FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
COPY tools/synth-probe/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY tools/synth-probe /app
COPY observability/golden_paths.yaml /app/observability/golden_paths.yaml
ENTRYPOINT ["python", "-m", "probe"]
CMD ["list", "--catalog", "/app/observability/golden_paths.yaml"]
