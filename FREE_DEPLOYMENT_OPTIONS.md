# Summit Application - Free Deployment Options

## Free Cloud Deployment Alternatives

Since traditional cloud providers (AWS, Azure, GCP) require payment information, here are free alternatives to deploy Summit:

### Option 1: K3s on a Free Tier VM
Many providers offer free tier VMs where you can run a lightweight Kubernetes cluster:

#### DigitalOcean ($200 credit for 60 days, then ~$5/month for basic droplet)
```bash
# On a Linux VM (Ubuntu 20.04+):
curl -sfL https://get.k3s.io | sh -

# Configure kubectl
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
export KUBECONFIG=~/.kube/config

# Then run the deployment
cd /home/bcl/Summit/summit
./deploy-simple.sh
```

#### Oracle Cloud (Always Free tier with 2 VMs)
Oracle offers always-free VMs that can run K3s.

#### AWS EC2 (Free tier eligible for 12 months)
AWS offers a limited free tier that includes one EC2 instance.

### Option 2: Railway (Free tier available)
Railway offers container deployments with a generous free tier:
1. Sign up at railway.app
2. Import your Summit repository
3. Use the provided deployment templates

### Option 3: Render (Free tier available)
Render offers web service hosting with a free tier:
1. Sign up at render.com
2. Connect to your GitHub repository
3. Create web services for each Summit component

### Option 4: Fly.io (Free tier with 3 shared CPU machines)
Fly.io allows deploying containerized apps globally:
1. Sign up at fly.io
2. Install flyctl: `curl -L https://fly.io/install.sh | sh`
3. Deploy using: `fly launch`

### Option 5: Local Kubernetes with Public Access
If you have a public IP address, you can run Kubernetes locally:
1. Install Kind or Minikube locally
2. Use ngrok to expose services publicly
3. Configure DNS to point to ngrok URL

## Recommended Approach: Fly.io

For a truly free deployment, I recommend Fly.io:

1. **Sign up for Fly.io** at https://fly.io
2. **Install flyctl**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
3. **Authenticate**:
   ```bash
   fly auth login
   ```
4. **Initialize your app**:
   ```bash
   cd /home/bcl/Summit/summit
   fly launch
   ```
5. **Deploy each service separately** (since Summit has multiple components)

## Important Considerations

- **Free tier limitations**: Most free tiers have resource limits (CPU, RAM, bandwidth)
- **Data persistence**: Free tiers may not offer persistent storage
- **Uptime guarantees**: Free services may have lower SLAs
- **Domain configuration**: May require special setup for custom domains

## Docker Compose Alternative

If you want to run Summit locally with public access:
```bash
cd /home/bcl/Summit/summit
docker compose up -d
```

Then use a service like ngrok to expose it publicly:
```bash
ngrok http 4000  # For API
ngrok http 3000  # For web interface
```

## Next Steps

1. Choose one of the free deployment options above
2. Set up your account with the chosen provider
3. Follow their specific instructions to deploy Summit
4. Configure your domain (topicality.co) to point to the deployment

The Summit application is fully prepared for deployment with all the necessary configurations and scripts already created.