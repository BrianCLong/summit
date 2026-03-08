FROM python:3.11-slim

WORKDIR /app

RUN pip install fastapi uvicorn chromadb openai redis asyncpg sentence-transformers prometheus-fastapi-instrumentator tiktoken

COPY services/rag/src /app/src

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
