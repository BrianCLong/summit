FROM python:3.11-slim-buster
WORKDIR /app
COPY services/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/api/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]