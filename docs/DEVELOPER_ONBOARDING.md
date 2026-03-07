# 🚀 Developer Onboarding: IntelGraph

> **⚠️ MOVED:** This guide has been superseded by the **[Developer Enablement Pack](../planning/enablement-pack/README.md)**.
> Please refer to **[Onboarding & Quickstart](../planning/enablement-pack/onboarding-quickstart.md)** for the up-to-date Golden Path.

## ⏱️ Quick Summary (Legacy)

The original onboarding instructions are preserved below for reference but may be outdated.

### 1. **Clone & Setup**

```bash
# Clone repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env
```

### 2. **Start Everything**

```bash
# Start development environment
pnpm run docker:dev
```

### 3. **Verify**

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/graphql

For full details, see the **[Enablement Pack](../planning/enablement-pack/README.md)**.
