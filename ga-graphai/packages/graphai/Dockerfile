FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install fastapi uvicorn[standard]
COPY src ./src
CMD ["uvicorn", "graphai.src.main:app", "--host", "0.0.0.0", "--port", "8000"]
