#!/bin/bash
set -euo pipefail

# Defaults (can be overridden via flags or env)
DEV_HOST_DEFAULT="dev.topicality.co"
DEV_USER_DEFAULT="ec2-user"
SSH_KEY_DEFAULT="${HOME}/.ssh/maestro-keypair.pem"
SERVER_NAME_DEFAULT="dev.topicality.co"

DEV_HOST="${DEV_HOST:-$DEV_HOST_DEFAULT}"
DEV_USER="${DEV_USER:-$DEV_USER_DEFAULT}"
SSH_KEY="${SSH_KEY:-$SSH_KEY_DEFAULT}"
SERVER_NAME="${SERVER_NAME:-$SERVER_NAME_DEFAULT}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--host HOST] [--user USER] [--key PATH] [--server-name NAME] [--image IMAGE] [--port PORT] [--health-path PATH] [--ghcr-username USER --ghcr-token TOKEN] [--use-ssm --instance-id ID | --tag-name NAME --region REGION [--profile PROFILE]]

Options:
  --host         SSH target hostname or IP (default: $DEV_HOST_DEFAULT)
  --user         SSH username (default: $DEV_USER_DEFAULT)
  --key          Path to SSH private key (default: $SSH_KEY_DEFAULT)
  --server-name  Nginx server_name to configure (default: $SERVER_NAME_DEFAULT)
  --image        Maestro image to run (default: ghcr.io/brianclong/maestro:latest)
  --port         Container/listen port (default: 8080)
  --health-path  Health path for checks (default: /healthz)
  --ghcr-username  GHCR username for private image (optional)
  --ghcr-token     GHCR token (will be used via stdin, optional)
  --use-ssm      Use AWS SSM (Session Manager) instead of SSH/SCP
  --instance-id  EC2 instance ID for SSM (e.g., i-0123456789abcdef0)
  --tag-name     Look up instance-id by tag:Name (e.g., maestro-conductor)
  --region       AWS region for SSM (e.g., us-east-2)
  --profile      AWS CLI profile to use (optional)
  -h, --help     Show this help and exit

Environment overrides:
  DEV_HOST, DEV_USER, SSH_KEY, SERVER_NAME, AWS_PROFILE, IMAGE, PORT, HEALTH_PATH, GHCR_USERNAME, GHCR_TOKEN
USAGE
}

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      [[ $# -lt 2 ]] && { echo "--host requires an argument" >&2; exit 1; }
      DEV_HOST="$2"; shift 2 ;;
    --user)
      [[ $# -lt 2 ]] && { echo "--user requires an argument" >&2; exit 1; }
      DEV_USER="$2"; shift 2 ;;
    --key)
      [[ $# -lt 2 ]] && { echo "--key requires an argument" >&2; exit 1; }
      SSH_KEY="$2"; shift 2 ;;
    --server-name)
      [[ $# -lt 2 ]] && { echo "--server-name requires an argument" >&2; exit 1; }
      SERVER_NAME="$2"; shift 2 ;;
    --use-ssm)
      USE_SSM=1; shift ;;
    --instance-id)
      [[ $# -lt 2 ]] && { echo "--instance-id requires an argument" >&2; exit 1; }
      INSTANCE_ID="$2"; shift 2 ;;
    --region)
      [[ $# -lt 2 ]] && { echo "--region requires an argument" >&2; exit 1; }
      AWS_REGION="$2"; shift 2 ;;
    --profile)
      [[ $# -lt 2 ]] && { echo "--profile requires an argument" >&2; exit 1; }
      AWS_PROFILE="$2"; shift 2 ;;
    --tag-name)
      [[ $# -lt 2 ]] && { echo "--tag-name requires an argument" >&2; exit 1; }
      TAG_NAME="$2"; shift 2 ;;
    --image)
      [[ $# -lt 2 ]] && { echo "--image requires an argument" >&2; exit 1; }
      IMAGE="$2"; shift 2 ;;
    --port)
      [[ $# -lt 2 ]] && { echo "--port requires an argument" >&2; exit 1; }
      PORT="$2"; shift 2 ;;
    --health-path)
      [[ $# -lt 2 ]] && { echo "--health-path requires an argument" >&2; exit 1; }
      HEALTH_PATH="$2"; shift 2 ;;
    --ghcr-username)
      [[ $# -lt 2 ]] && { echo "--ghcr-username requires an argument" >&2; exit 1; }
      GHCR_USERNAME="$2"; shift 2 ;;
    --ghcr-token)
      [[ $# -lt 2 ]] && { echo "--ghcr-token requires an argument" >&2; exit 1; }
      GHCR_TOKEN="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage; exit 1 ;;
  esac
done

# Normalize key path (expand ~ if present)
if [[ "$SSH_KEY" == ~* ]]; then
  SSH_KEY="${SSH_KEY/#~/$HOME}"
fi

echo "🚀 Starting Maestro on Development Instance: ${DEV_USER}@${DEV_HOST}"

# Connection mode
USE_SSM=${USE_SSM:-0}

# Preflight checks (for SSH mode)
if [[ "$USE_SSM" -ne 1 ]]; then
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "❌ SSH key not found: $SSH_KEY" >&2
    exit 1
  fi
fi

# Create a comprehensive startup script
cat > start_maestro.sh << 'SCRIPT_EOF'
#!/bin/bash
set -euo pipefail

echo "🔧 Starting Maestro development environment..."

# Ensure Docker is running
sudo systemctl start docker
sudo systemctl enable docker

# Add ec2-user to docker group if not already done
sudo usermod -aG docker ec2-user

# Defaults from environment with fallbacks
IMAGE="${IMAGE:-ghcr.io/brianclong/maestro:latest}"
PORT="${PORT:-8080}"
HEALTH_PATH="${HEALTH_PATH:-/healthz}"

# If GHCR creds provided, login for private images
if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  echo "🔐 Logging into GHCR as ${GHCR_USERNAME}"
  echo -n "$GHCR_TOKEN" | sudo docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin || {
    echo "⚠️  GHCR login failed; will try anonymous pull" >&2
  }
fi

# Create docker-compose file if it doesn't exist
cat > /home/ec2-user/docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'
services:
  maestro-dev:
    image: ${IMAGE}
    ports:
      - "${PORT}:${PORT}"
    environment:
      - NODE_ENV=development
      - PORT=${PORT}
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${PORT}${HEALTH_PATH}"]
      interval: 30s
      timeout: 10s
      retries: 3
COMPOSE_EOF

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Pull latest image and start
set +e
docker-compose pull
PULL_STATUS=$?
set -e
if [[ $PULL_STATUS -ne 0 ]]; then
  echo "❌ docker-compose pull failed (status $PULL_STATUS). Check GHCR credentials if image is private." >&2
fi
docker-compose up -d

echo "✅ Docker containers started"
docker-compose ps

# Configure nginx if not already done
sudo tee /etc/nginx/conf.d/maestro.conf > /dev/null << NGINX_EOF
server {
    listen 80 default_server;
    server_name ${SERVER_NAME:-dev.topicality.co} _;
    
    location / {
        proxy_pass http://localhost:${PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    location = /health {
        proxy_pass http://localhost:${PORT}${HEALTH_PATH};
        access_log off;
    }
}
NGINX_EOF

# Install nginx if needed
if ! command -v nginx &> /dev/null; then
    sudo yum install -y nginx
fi

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Nginx configured and restarted"

# Wait for container to be healthy
echo "⏳ Waiting for Maestro to be ready..."
for i in {1..30}; do
    if curl -f -s "http://localhost:${PORT}${HEALTH_PATH}" >/dev/null 2>&1; then
        echo "✅ Maestro is healthy!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 10
done

# Final status
echo ""
echo "🎯 Final Status Check:"
echo "Container status:"
docker-compose ps
echo ""
echo "Maestro health check:"
if ! curl -s "http://localhost:${PORT}${HEALTH_PATH}"; then
  echo "Health check failed; recent container logs:" >&2
  docker ps
  docker logs --tail=200 maestro-dev || true
fi
echo ""
echo "✅ Maestro development environment is ready!"

SCRIPT_EOF

if [[ "$USE_SSM" -eq 1 ]]; then
  # SSM mode
  if [[ -z "${INSTANCE_ID:-}" ]] && [[ -n "${TAG_NAME:-}" ]]; then
    PROFILE_ARGS=()
    [[ -n "${AWS_PROFILE:-}" ]] && PROFILE_ARGS+=("--profile" "$AWS_PROFILE")
    echo "🔎 Resolving instance-id by tag:Name=${TAG_NAME} in ${AWS_REGION}"
    INSTANCE_ID=$(aws ec2 describe-instances \
      --region "$AWS_REGION" \
      ${PROFILE_ARGS[@]} \
      --filters "Name=tag:Name,Values=${TAG_NAME}" "Name=instance-state-name,Values=running" \
      --query 'Reservations[0].Instances[0].InstanceId' \
      --output text 2>/dev/null || true)
  fi
  : "${INSTANCE_ID:?--instance-id or --tag-name is required with --use-ssm}"
  : "${AWS_REGION:?--region is required with --use-ssm}"
  if ! command -v aws >/dev/null 2>&1; then
    echo "❌ AWS CLI is required for --use-ssm" >&2
    exit 1
  fi

  echo "🔗 Using AWS SSM to run remote bootstrap on ${INSTANCE_ID} in ${AWS_REGION}"

  # Base64 encode the startup script (portable across BSD/GNU)
  if base64 --help 2>&1 | grep -q -- '-w'; then
    SCRIPT_B64=$(base64 -w 0 start_maestro.sh)
  else
    SCRIPT_B64=$(base64 < start_maestro.sh | tr -d '\n')
  fi

  # Build the commands array for SSM
  SSM_COMMANDS=(
    "set -euo pipefail"
    "echo '${SCRIPT_B64}' | base64 -d > start_maestro.sh"
    "chmod +x start_maestro.sh"
    "export SERVER_NAME='${SERVER_NAME}'; export IMAGE='${IMAGE:-}'; export PORT='${PORT:-}'; export HEALTH_PATH='${HEALTH_PATH:-}'; export GHCR_USERNAME='${GHCR_USERNAME:-}'; export GHCR_TOKEN='${GHCR_TOKEN:-}'; bash -lc './start_maestro.sh'"
  )

  # Ensure we have a JSON escaper
  JSON_ESCAPE_TOOL=""
  if command -v python3 >/dev/null 2>&1; then
    JSON_ESCAPE_TOOL="python3"
  elif command -v jq >/dev/null 2>&1; then
    JSON_ESCAPE_TOOL="jq"
  else
    echo "❌ Need either python3 or jq installed locally to JSON-encode SSM commands" >&2
    exit 1
  fi

  # Convert commands to JSON array format
  COMMANDS_JSON="["
  for cmd in "${SSM_COMMANDS[@]}"; do
    # JSON escape
    if [[ "$JSON_ESCAPE_TOOL" == "python3" ]]; then
      esc=$(printf '%s' "$cmd" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
    else
      esc=$(printf '%s' "$cmd" | jq -R .)
    fi
    COMMANDS_JSON+="${esc},"
  done
  COMMANDS_JSON="${COMMANDS_JSON%,}]"

  PROFILE_ARGS=()
  [[ -n "${AWS_PROFILE:-}" ]] && PROFILE_ARGS+=("--profile" "$AWS_PROFILE")

  CMD_ID=$(aws ssm send-command \
    --region "$AWS_REGION" \
    ${PROFILE_ARGS[@]} \
    --instance-ids "$INSTANCE_ID" \
    --document-name AWS-RunShellScript \
    --comment "Start Maestro dev via start_maestro.sh" \
    --parameters commands="${COMMANDS_JSON}" \
    --query 'Command.CommandId' \
    --output text)

  echo "📨 Sent SSM command: $CMD_ID. Waiting for completion..."

  # Poll for status
  for i in {1..60}; do
    STATUS=$(aws ssm list-command-invocations \
      --region "$AWS_REGION" \
      "${PROFILE_ARGS[@]}" \
      --command-id "$CMD_ID" \
      --details \
      --query 'CommandInvocations[0].Status' \
      --output text 2>/dev/null || echo "PENDING")
    echo "⏳ SSM status: $STATUS"
    case "$STATUS" in
      Success) break;;
      Failed|Cancelled|TimedOut)
        echo "❌ SSM command ended with status: $STATUS" >&2
        aws ssm get-command-invocation --region "$AWS_REGION" "${PROFILE_ARGS[@]}" --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" || true
        exit 1;;
    esac
    sleep 5
  done

  echo "✅ SSM command completed"
  aws ssm get-command-invocation --region "$AWS_REGION" "${PROFILE_ARGS[@]}" --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" || true

else
  # SSH mode: copy and execute the script on the remote instance
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no start_maestro.sh "${DEV_USER}@${DEV_HOST}:/home/${DEV_USER}/"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=20 "${DEV_USER}@${DEV_HOST}" "SERVER_NAME='${SERVER_NAME}' bash -lc 'chmod +x start_maestro.sh && ./start_maestro.sh'"
fi

echo "🎉 Development environment startup complete!"
