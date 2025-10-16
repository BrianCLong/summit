# Production Deployment Guide

This guide provides instructions for deploying the IntelGraph platform to a production environment. The primary deployment method uses Docker Compose and shell scripts.

## Prerequisites

Before you begin, ensure you have the following:

- A server or virtual machine with a recent version of Linux.
- Docker and Docker Compose installed.
- If deploying to AWS, an AWS account with an EC2 key pair.
- SSH access to the deployment server.

## Deployment to AWS

The repository includes a script to automate deployment to an AWS EC2 instance. This script will set up Docker, Docker Compose, and nginx as a reverse proxy.

### 1. Configure Script

Open the `deploy-to-aws.sh` script and configure the following variables:

```bash
EC2_IP="YOUR_EC2_INSTANCE_IP"
SSH_KEY="/path/to/your/maestro-keypair.pem"
DOMAIN="your-domain.com"
```

### 2. Run the Deployment Script

Execute the script from your local machine:

```bash
./deploy-to-aws.sh
```

The script will perform the following actions:

- Install Docker and Docker Compose on the EC2 instance.
- Install and configure nginx as a reverse proxy.
- Copy the `docker-compose.yml` file to the server.
- Start the application services using Docker Compose.

### 3. Configure DNS

After the script completes, you will need to configure the DNS records for your domain to point to the EC2 instance's IP address.

## Manual Deployment with Docker Compose

If you are not deploying to AWS, you can use Docker Compose to manually deploy the application.

### 1. Backend Implementation

The `backend-deployment.sh` script is a one-time setup script that creates the entire backend, including the database schema and service configurations. It is crucial to run this script before starting the services.

```bash
./backend-deployment.sh
```

This script will:

- Install backend dependencies.
- Create the necessary directory structure.
- Generate configuration files.
- Set up the database connections for Neo4j, PostgreSQL, and Redis.

### 2. Environment Configuration

Before running Docker Compose, you need to create a `.env` file in the `server` directory with the necessary environment variables. The `server/src/config/index.js` file, created by the `backend-deployment.sh` script, lists all the required variables. These include database credentials, JWT secrets, and other service configurations.

### 3. Start Services

Once the backend is set up and the environment is configured, you can start all the services using Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This command will start the services in detached mode. You can use other `docker-compose.*.yml` files for different environments.

## Health Checks

After deployment, you can verify that the application is running correctly by accessing the health check endpoint defined in the `Dockerfile`:

```bash
curl -f http://localhost:3000/healthz
```

If the application is healthy, this command will return a `200 OK` status.

## Production Considerations

- **Security:** Ensure that all secrets and credentials are managed securely and not hardcoded in the deployment scripts.
- **Data Backup:** Implement a regular backup strategy for your databases (PostgreSQL and Neo4j).
- **Monitoring:** Set up a monitoring and alerting system to track the health and performance of your services.
- **SSL/TLS:** Configure nginx or another reverse proxy with SSL/TLS certificates to secure communication.
