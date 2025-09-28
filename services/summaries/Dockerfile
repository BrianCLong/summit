FROM python:3.12-slim
RUN pip install --no-cache-dir fastapi uvicorn[standard] sentence-transformers torch transformers accelerate bitsandbytes --index-url https://download.pytorch.org/whl/cpu
ENV MODEL_NAME=mistralai/Mistral-7B-Instruct-v0.3 MAX_TOKENS=768 DEVICE=auto
WORKDIR /app
COPY app.py .
CMD ["uvicorn","app:app","--host","0.0.0.0","--port","9201"]