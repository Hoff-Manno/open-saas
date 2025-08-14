#!/bin/bash

# Quick setup script for PDF Learning SaaS deployment preparation
echo "🚀 Setting up PDF Learning SaaS for deployment"
echo "==============================================="

# Check if we're in the right directory
if [ ! -f "main.wasp" ]; then
    echo "❌ Error: This script must be run from the app directory (where main.wasp is located)"
    exit 1
fi

echo "1. Creating environment files from examples..."

# Create .env.server if it doesn't exist
if [ ! -f ".env.server" ]; then
    cp .env.server.example .env.server
    echo "✅ Created .env.server from .env.server.example"
    echo "📝 Please edit .env.server and fill in your production values"
else
    echo "⚠️  .env.server already exists"
fi

# Create .env.client if it doesn't exist
if [ ! -f ".env.client" ]; then
    cp .env.client.example .env.client
    echo "✅ Created .env.client from .env.client.example"
    echo "📝 Please edit .env.client and fill in your production values"
else
    echo "⚠️  .env.client already exists"
fi

echo
echo "2. Installing dependencies..."
npm install

echo
echo "3. Next steps:"
echo "=============="
echo "1. Edit .env.server with your production API keys and configuration"
echo "2. Edit .env.client with your production client-side variables"
echo "3. Install Fly CLI if you haven't: curl -L https://fly.io/install.sh | sh"
echo "4. Login to Fly.io: fly auth login"
echo "5. Run the pre-deployment check: ./scripts/pre-deploy-check.sh"
echo "6. Deploy your app: wasp deploy"
echo
echo "📖 For detailed instructions, see DEPLOY.md"
echo
echo "🎉 Setup complete!"
