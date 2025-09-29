FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn[standard] torch==2.3.1 sentence-transformers
COPY predictive_service /app
EXPOSE 8080
CMD ["python", "app.py"]
