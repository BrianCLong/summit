FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for numpy/scipy compilation if no wheels)
# but slim usually works for common packages.

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY validator.py .
COPY loader.py .
COPY run_check.sh .

RUN chmod +x run_check.sh

# Default command can be run_check.sh or just python
CMD ["./run_check.sh"]
