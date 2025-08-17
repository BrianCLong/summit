FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
ARG SPACY_MODEL=en_core_web_sm
RUN python3 -m spacy download ${SPACY_MODEL}

COPY . .

RUN ls -l /app

CMD ["python3", "-u", "main.py"]
