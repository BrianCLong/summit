FROM python:3.12-slim
RUN pip install --no-cache-dir fastapi uvicorn[standard] sentence-transformers torch --index-url https://download.pytorch.org/whl/cpu
ENV MODEL_NAME=intfloat/multilingual-e5-base BATCH_SIZE=32 DEVICE=auto
WORKDIR /app
COPY app.py .
CMD ["uvicorn","app:app","--host","0.0.0.0","--port","9100"]