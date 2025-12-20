#!/bin/bash

set -e

# Create a temporary directory for the release
rm -rf /tmp/release
mkdir -p /tmp/release

# Copy the components to the temporary directory
echo "Copying components..."
rsync -av --exclude='node_modules' --exclude='dist' --exclude='__pycache__' companyos/ /tmp/release/companyos/
cp -r maestro/ /tmp/release/maestro
cp -r .mc/ /tmp/release/.mc
cp -r services/api-gateway/ /tmp/release/switchboard

# Create the Dockerfile for Maestro Conductor
echo "Creating Dockerfile for maestro-conductor..."
cat << EOF > /tmp/release/maestro/Dockerfile
# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the requirements file into the container at /usr/src/app
COPY requirements.txt ./

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code from the host to the container at /usr/src/app
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run app.py when the container launches
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Create the Docker Compose file
echo "Creating docker-compose.yml..."
cat << EOF > /tmp/release/docker-compose.yml
version: "3.9"

services:
  companyos:
    build:
      context: ./companyos/services/companyos-api
    env_file:
      - ./companyos/env.example
    ports:
      - "4100:4000"
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: companyos
      POSTGRES_PASSWORD: companyos
      POSTGRES_DB: companyos
    ports:
      - "5435:5432"
    volumes:
      - companyos-db-data:/var/lib/postgresql/data

  maestro-conductor:
    build:
      context: ./maestro
    ports:
      - "8000:8000"

  switchboard:
    build:
      context: ./switchboard
    ports:
      - "3000:3000"

volumes:
  companyos-db-data: {}
EOF

# Create the README file
echo "Creating README.md..."
cat << EOF > /tmp/release/README.md
# Lightweight Release Package

This package contains a self-contained release of CompanyOS, Maestro Conductor, Maestro Composer, and Switchboard.

## Included Components

*   **CompanyOS**: The operational blueprint and governance artifacts.
*   **Maestro Conductor**: A FastAPI application for managing release artifacts and compliance.
*   **Maestro Composer**: A tool for running canary deployment gates.
*   **Switchboard**: An API gateway.

## Getting Started

To build and run the services, use the included \`docker-compose.yml\` file:

\`\`\`bash
docker-compose up --build -d
\`\`\`

This will build and start the following services:

*   \`companyos\`: The main CompanyOS application, available at \`http://localhost:4100\`.
*   \`db\`: A PostgreSQL database for CompanyOS.
*   \`maestro-conductor\`: The Maestro Conductor API, available at \`http://localhost:8000\`.
*   \`switchboard\`: The Switchboard API gateway, available at \`http://localhost:3000\`.

## Using Maestro Composer

The Maestro Composer script (\`mc-gates-runner.py\`) is located in the \`.mc/v0.2\` directory. To use it, you can execute it directly:

\`\`\`bash
python .mc/v0.2/mc-gates-runner.py --stage <stage> --report <report-file>
\`\`\`

Replace \`<stage>\` with one of \`canary_20\`, \`canary_50\`, or \`production\`, and \`<report-file>\` with the desired output path for the deployment report.
EOF

# Create the release archive
echo "Creating release archive..."
tar -czf /tmp/release.tar.gz -C /tmp/release .

# Create the release directory if it doesn't exist
mkdir -p release/

# Move the archive to the release directory
echo "Moving release archive..."
mv /tmp/release.tar.gz release/

# Clean up the temporary directory
rm -rf /tmp/release

echo "Release created successfully!"
