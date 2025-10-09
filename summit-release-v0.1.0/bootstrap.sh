#!/bin/bash
set -euo pipefail

# 0) Prereqs
echo "Installing prerequisites..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg make git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
| sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"

# 1) Fetch GA release
echo "Fetching Summit GA release..."
mkdir -p ~/apps && cd ~/apps
if [ ! -d summit ]; then git clone https://github.com/BrianCLong/summit.git; fi
cd summit/summit-release-v0.1.0

# 2) Configure env
echo "Configuring environment..."
cp -n .env.example .env
echo "👉 Edit .env if needed (passwords, ports). Using defaults for now."

# 3) Launch core + verify, then app + smoke
echo "Launching Summit services..."
make up && make verify
make app && make smoke

# 4) Optional: install systemd unit for auto-start at boot
echo "Installing systemd service..."
SERVICE=/etc/systemd/system/summit-ga.service
sudo bash -c "cat > $SERVICE" <<'UNIT'
[Unit]
Description=Summit GA (v0.1.0-ga) via Docker Compose
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
WorkingDirectory=%h/apps/summit/summit-release-v0.1.0
RemainAfterExit=yes
ExecStart=/usr/bin/docker compose -f docker-compose.fresh.yml -f docker-compose.app.yml -f docker-compose.observability.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.fresh.yml -f docker-compose.app.yml -f docker-compose.observability.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable summit-ga.service
sudo systemctl start summit-ga.service

echo "✅ Summit GA is up. If you just added yourself to the docker group, log out/in once."
echo ""
echo "Verify locally (default ports):"
echo "* API: http://localhost:18081/health → expect OK"
echo "* Web: http://localhost:18082/ (UI loads)"
echo "* Adminer: http://localhost:18080/"
echo ""
echo "Common ops:"
echo "# Logs & status"
echo "docker compose ps"
echo "docker compose logs -f"
echo ""
echo "# Day-2 helpers (from Makefile)"
echo "make drill     # backup/restore dry-run"
echo "make evidence  # rebuild evidence bundle"
echo "make down && make up"