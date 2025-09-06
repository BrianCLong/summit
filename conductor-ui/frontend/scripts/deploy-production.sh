#!/bin/bash
set -euo pipefail

# Maestro Production Deployment Script
echo "🚀 Deploying Maestro to production..."

# Configuration
DEPLOY_TARGET="${DEPLOY_TARGET:-maestro-dev.topicality.co}"
DEPLOY_USER="${DEPLOY_USER:-deployer}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/maestro}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/maestro}"

echo "📋 Deployment Configuration:"
echo "  - Target: $DEPLOY_TARGET"
echo "  - User: $DEPLOY_USER"
echo "  - Path: $DEPLOY_PATH"
echo "  - Backup: $BACKUP_DIR"

# Pre-deployment checks
echo "🔍 Pre-deployment checks..."

# Check if build exists
if [ ! -d "dist" ]; then
    echo "❌ No build found. Run build-production.sh first."
    exit 1
fi

# Check build manifest
if [ ! -f "dist/build-manifest.json" ]; then
    echo "❌ Build manifest not found. Invalid build."
    exit 1
fi

# Test deployment target connectivity
echo "🌐 Testing connectivity to $DEPLOY_TARGET..."
if ! ssh -o ConnectTimeout=5 "$DEPLOY_USER@$DEPLOY_TARGET" "echo 'Connection successful'"; then
    echo "❌ Cannot connect to deployment target"
    exit 1
fi

# Create backup
echo "💾 Creating backup..."
BACKUP_NAME="maestro-$(date +%Y%m%d-%H%M%S)"

ssh "$DEPLOY_USER@$DEPLOY_TARGET" "
    sudo mkdir -p $BACKUP_DIR &&
    if [ -d $DEPLOY_PATH ]; then
        sudo cp -r $DEPLOY_PATH $BACKUP_DIR/$BACKUP_NAME
        echo '✅ Backup created: $BACKUP_DIR/$BACKUP_NAME'
    else
        echo 'ℹ️  No existing deployment to backup'
    fi
"

# Upload new build
echo "📤 Uploading new build..."
rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    dist/ "$DEPLOY_USER@$DEPLOY_TARGET:$DEPLOY_PATH.tmp/"

# Atomic deployment
echo "🔄 Performing atomic deployment..."
ssh "$DEPLOY_USER@$DEPLOY_TARGET" "
    # Prepare new deployment
    sudo rm -rf $DEPLOY_PATH.new
    sudo mv $DEPLOY_PATH.tmp $DEPLOY_PATH.new

    # Atomic switch
    if [ -d $DEPLOY_PATH ]; then
        sudo mv $DEPLOY_PATH $DEPLOY_PATH.old
    fi
    sudo mv $DEPLOY_PATH.new $DEPLOY_PATH

    # Set permissions
    sudo chown -R www-data:www-data $DEPLOY_PATH
    sudo chmod -R 755 $DEPLOY_PATH

    # Clean up old deployment
    if [ -d $DEPLOY_PATH.old ]; then
        sudo rm -rf $DEPLOY_PATH.old
    fi

    echo '✅ Atomic deployment completed'
"

# Verify deployment
echo "✅ Verifying deployment..."
DEPLOYED_VERSION=$(ssh "$DEPLOY_USER@$DEPLOY_TARGET" "cat $DEPLOY_PATH/build-manifest.json | grep '\"version\"' | cut -d'\"' -f4")
LOCAL_VERSION=$(cat dist/build-manifest.json | grep '"version"' | cut -d'"' -f4)

if [ "$DEPLOYED_VERSION" = "$LOCAL_VERSION" ]; then
    echo "✅ Version verification passed: $DEPLOYED_VERSION"
else
    echo "❌ Version mismatch: local=$LOCAL_VERSION, deployed=$DEPLOYED_VERSION"
    exit 1
fi

# Health check
echo "🏥 Running health checks..."
if curl -f -s "https://$DEPLOY_TARGET/maestro" > /dev/null; then
    echo "✅ Application is responding"
else
    echo "❌ Health check failed - rolling back..."
    
    # Rollback
    ssh "$DEPLOY_USER@$DEPLOY_TARGET" "
        if [ -d $BACKUP_DIR/$BACKUP_NAME ]; then
            sudo rm -rf $DEPLOY_PATH.failed
            sudo mv $DEPLOY_PATH $DEPLOY_PATH.failed
            sudo cp -r $BACKUP_DIR/$BACKUP_NAME $DEPLOY_PATH
            sudo chown -R www-data:www-data $DEPLOY_PATH
            echo '↩️  Rollback completed'
        else
            echo '❌ No backup found for rollback'
        fi
    "
    exit 1
fi

# Update nginx configuration if needed
echo "🔧 Updating web server configuration..."
ssh "$DEPLOY_USER@$DEPLOY_TARGET" "
    # Reload nginx configuration
    sudo nginx -t && sudo systemctl reload nginx
    echo '✅ Web server configuration updated'
"

# Post-deployment tasks
echo "🔄 Running post-deployment tasks..."

# Clear CDN cache if configured
if [ -n "${CDN_CACHE_URL:-}" ]; then
    echo "🔄 Clearing CDN cache..."
    curl -X POST "$CDN_CACHE_URL/purge" || echo "⚠️  CDN cache purge failed"
fi

# Notify monitoring systems
if [ -n "${WEBHOOK_URL:-}" ]; then
    echo "📢 Notifying monitoring systems..."
    curl -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"Maestro deployed successfully\",
            \"version\": \"$LOCAL_VERSION\", 
            \"target\": \"$DEPLOY_TARGET\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }" || echo "⚠️  Webhook notification failed"
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "  - Version: $LOCAL_VERSION"
echo "  - Target: https://$DEPLOY_TARGET/maestro"
echo "  - Backup: $BACKUP_DIR/$BACKUP_NAME"
echo "  - Status: ✅ Healthy"
echo ""
echo "🔗 Quick Links:"
echo "  - Application: https://$DEPLOY_TARGET/maestro"
echo "  - Health Check: https://$DEPLOY_TARGET/maestro/health"
echo "  - Build Info: https://$DEPLOY_TARGET/maestro/build-manifest.json"