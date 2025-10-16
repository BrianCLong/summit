# Dockerfile for Adversarial Misinformation Defense Platform

# Use Python 3.10 slim image as base
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AMD_DATA_DIR=/app/data \
    AMD_MODEL_DIR=/app/models \
    AMD_LOG_DIR=/app/logs

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    git \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install additional system packages needed for image processing
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY . .

# Create directories
RUN mkdir -p ${AMD_DATA_DIR} ${AMD_MODEL_DIR} ${AMD_LOG_DIR}

# Expose port for web interface
EXPOSE 8000

# Create non-root user
RUN adduser --disabled-password --gecos '' amduser && \
    chown -R amduser:amduser /app
USER amduser

# Set entrypoint
ENTRYPOINT ["python", "main.py"]

# Default command
CMD ["--help"]