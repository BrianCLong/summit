FROM python:3.9-slim-buster

WORKDIR /app

ENV MODEL_NAME="j-hartmann/emotion-english-distilroberta-base"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]