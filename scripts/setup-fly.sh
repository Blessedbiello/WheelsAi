#!/bin/bash
# WheelsAI - Fly.io Deployment Setup Script
# Run this script to create and configure Fly.io apps

set -e

echo "==================================="
echo "WheelsAI Fly.io Setup"
echo "==================================="

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "Error: flyctl is not installed"
    echo "Install with: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "Please log in to Fly.io first:"
    flyctl auth login
fi

# Get environment
read -p "Environment (staging/production): " ENV
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
    echo "Error: Environment must be 'staging' or 'production'"
    exit 1
fi

# Set app names
if [ "$ENV" = "staging" ]; then
    API_APP="wheelsai-api-staging"
    WEB_APP="wheelsai-web-staging"
    REGION="lax"
else
    API_APP="wheelsai-api"
    WEB_APP="wheelsai-web"
    REGION="lax"
fi

echo ""
echo "Creating Fly.io apps for $ENV environment..."
echo ""

# Create API app
echo "Creating API app: $API_APP"
cd apps/api
flyctl apps create "$API_APP" --org personal 2>/dev/null || echo "App $API_APP already exists"

# Create Web app
echo "Creating Web app: $WEB_APP"
cd ../web
flyctl apps create "$WEB_APP" --org personal 2>/dev/null || echo "App $WEB_APP already exists"

cd ../..

echo ""
echo "==================================="
echo "Apps created successfully!"
echo "==================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Create a Fly.io API token and add to GitHub secrets:"
echo "   flyctl tokens create deploy -x 999999h"
echo "   Add as FLY_API_TOKEN in GitHub repository secrets"
echo ""
echo "2. Create PostgreSQL database:"
echo "   flyctl postgres create --name wheelsai-db-$ENV --region $REGION"
echo "   flyctl postgres attach wheelsai-db-$ENV --app $API_APP"
echo ""
echo "3. Create Upstash Redis (via Fly.io):"
echo "   flyctl redis create --name wheelsai-redis-$ENV --region $REGION"
echo "   flyctl redis attach wheelsai-redis-$ENV --app $API_APP"
echo ""
echo "4. Set required secrets for API:"
echo "   flyctl secrets set -a $API_APP \\"
echo "     JWT_SECRET=\"\$(openssl rand -base64 32)\" \\"
echo "     SESSION_SECRET=\"\$(openssl rand -base64 32)\" \\"
echo "     MASTER_ENCRYPTION_KEY=\"\$(openssl rand -base64 32)\" \\"
echo "     SOLANA_RPC_URL=\"https://api.devnet.solana.com\" \\"
echo "     NOSANA_WALLET_PRIVATE_KEY=\"your-wallet-key\" \\"
echo "     STRIPE_SECRET_KEY=\"sk_test_xxx\" \\"
echo "     STRIPE_WEBHOOK_SECRET=\"whsec_xxx\""
echo ""
echo "5. Set required secrets for Web:"
echo "   flyctl secrets set -a $WEB_APP \\"
echo "     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=\"pk_test_xxx\""
echo ""
echo "6. Run database migrations:"
echo "   flyctl ssh console -a $API_APP -C \"npx prisma migrate deploy\""
echo ""
echo "7. Deploy:"
echo "   cd apps/api && flyctl deploy --config fly.$ENV.toml"
echo "   cd apps/web && flyctl deploy --config fly.$ENV.toml"
echo ""
