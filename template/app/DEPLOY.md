# Deploying PDF Learning SaaS to Fly.io

This guide will help you deploy your PDF Learning SaaS application to Fly.io using Wasp's built-in deployment capabilities.

## Prerequisites

1. **Install required tools:**
   - [Wasp CLI](https://wasp.sh/docs/installation) - should already be installed
   - [Fly CLI](https://fly.io/docs/flyctl/install/) - install with: `curl -L https://fly.io/install.sh | sh`

2. **Create Fly.io account:**
   - Sign up at [https://fly.io/](https://fly.io/)
   - Run `fly auth login` to authenticate

3. **Prepare environment variables:**
   - Copy `.env.server.example` to `.env.server` and fill in production values
   - Copy `.env.client.example` to `.env.client` and fill in production values

## Deployment Steps

### 1. Deploy with Wasp CLI (Recommended)

The easiest way to deploy is using Wasp's one-command deploy:

```bash
# Set client-side environment variables and deploy
REACT_APP_GOOGLE_ANALYTICS_ID=your_ga_id wasp deploy
```

This command will:
- Create and configure fly.io apps for both client and server
- Set up a PostgreSQL database
- Deploy both frontend and backend
- Set essential server environment variables automatically

### 2. Set Additional Environment Variables

After deployment, set your production secrets:

```bash
# Payment processor secrets
fly secrets set STRIPE_API_KEY=sk_live_... -a pdf-learning-saas-server
fly secrets set STRIPE_WEBHOOK_SECRET=whsec_... -a pdf-learning-saas-server
fly secrets set STRIPE_CUSTOMER_PORTAL_URL=https://billing.stripe.com/... -a pdf-learning-saas-server

# Or for Lemon Squeezy
fly secrets set LEMONSQUEEZY_API_KEY=eyJ... -a pdf-learning-saas-server
fly secrets set LEMONSQUEEZY_STORE_ID=012345 -a pdf-learning-saas-server
fly secrets set LEMONSQUEEZY_WEBHOOK_SECRET=my-webhook-secret -a pdf-learning-saas-server

# Subscription plan IDs
fly secrets set PAYMENTS_STARTER_SUBSCRIPTION_PLAN_ID=012345 -a pdf-learning-saas-server
fly secrets set PAYMENTS_PROFESSIONAL_SUBSCRIPTION_PLAN_ID=012345 -a pdf-learning-saas-server
fly secrets set PAYMENTS_ENTERPRISE_SUBSCRIPTION_PLAN_ID=012345 -a pdf-learning-saas-server

# Admin emails
fly secrets set ADMIN_EMAILS=admin@yourdomain.com -a pdf-learning-saas-server

# Social auth (Google)
fly secrets set GOOGLE_CLIENT_ID=722... -a pdf-learning-saas-server
fly secrets set GOOGLE_CLIENT_SECRET=GOC... -a pdf-learning-saas-server

# Email service
fly secrets set SENDGRID_API_KEY=SG... -a pdf-learning-saas-server

# Optional: OpenAI API
fly secrets set OPENAI_API_KEY=sk-... -a pdf-learning-saas-server

# Optional: Analytics
fly secrets set PLAUSIBLE_API_KEY=gUTgtB... -a pdf-learning-saas-server
fly secrets set PLAUSIBLE_SITE_ID=yoursite.com -a pdf-learning-saas-server
fly secrets set PLAUSIBLE_BASE_URL=https://plausible.io/api -a pdf-learning-saas-server

# Optional: Google Analytics
fly secrets set GOOGLE_ANALYTICS_CLIENT_EMAIL=email@example.gserviceaccount.com -a pdf-learning-saas-server
fly secrets set GOOGLE_ANALYTICS_PROPERTY_ID=123456789 -a pdf-learning-saas-server
fly secrets set GOOGLE_ANALYTICS_PRIVATE_KEY=base64_encoded_private_key -a pdf-learning-saas-server

# AWS S3 (if using file upload)
fly secrets set AWS_S3_IAM_ACCESS_KEY=AKIA... -a pdf-learning-saas-server
fly secrets set AWS_S3_IAM_SECRET_KEY=... -a pdf-learning-saas-server
fly secrets set AWS_S3_FILES_BUCKET=your-bucket-name -a pdf-learning-saas-server
fly secrets set AWS_S3_REGION=us-east-1 -a pdf-learning-saas-server

# Required base variables (Wasp sets DATABASE_URL/JWT_SECRET/URLs automatically during deploy)
fly secrets set ADMIN_EMAILS=admin@yourdomain.com -a pdf-learning-saas-server
```

### 3. Set Up Production Webhooks

#### For Stripe:
1. Go to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://pdf-learning-saas-server.fly.dev/payments-webhook`
3. Select these events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy the signing secret and set it:
   ```bash
   fly secrets set STRIPE_WEBHOOK_SECRET=whsec_... -a pdf-learning-saas-server
   ```

#### For Lemon Squeezy:
1. Go to [Lemon Squeezy Webhooks Dashboard](https://app.lemonsqueezy.com/settings/webhooks)
2. Add webhook URL: `https://pdf-learning-saas-server.fly.dev/payments-webhook`
3. Select events: `order_created`, `subscription_created`, `subscription_updated`, `subscription_cancelled`
4. Set your webhook secret

### 4. Update Social Auth Redirect URLs

Add these redirect URLs to your OAuth app settings:

**Google OAuth:**
- Authorized redirect URI: `https://pdf-learning-saas-server.fly.dev/auth/google/callback`

**GitHub OAuth:**
- Authorization callback URL: `https://pdf-learning-saas-server.fly.dev/auth/github/callback`

### 5. Configure AWS S3 CORS (if using file upload)

Add your production domain to your S3 bucket's CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "https://pdf-learning-saas-client.fly.dev"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

## Monitoring and Management

### Check app status:
```bash
fly status -a pdf-learning-saas-client
fly status -a pdf-learning-saas-server
```

### View logs:
```bash
fly logs -a pdf-learning-saas-client
fly logs -a pdf-learning-saas-server
```

### Scale your app:
```bash
fly scale count 2 -a pdf-learning-saas-server  # Scale server to 2 instances
fly scale memory 4gb -a pdf-learning-saas-server  # Increase memory
```

### Database management:
```bash
# Connect to PostgreSQL
fly postgres connect -a pdf-learning-saas-db

# Create database backup
fly postgres backup create -a pdf-learning-saas-db
```

## Troubleshooting

### Common Issues:

1. **Build failures:** Check that all dependencies are properly installed
2. **Database connection issues:** Verify DATABASE_URL secret is set correctly
3. **Environment variable issues:** Use `fly secrets list -a app-name` to verify secrets
4. **CORS issues:** Ensure your client domain is added to S3 CORS and OAuth redirect URLs

### Useful Commands:
```bash
# SSH into running app
fly ssh console -a pdf-learning-saas-server

# Check environment variables
fly secrets list -a pdf-learning-saas-server

# Deploy specific version
wasp deploy fly deploy --context server --remote-only
```

## Production Checklist

- [ ] All environment variables set
- [ ] Payment webhooks configured
- [ ] Social auth redirect URLs updated  
- [ ] S3 CORS configured (if using file upload)
- [ ] Production API keys updated (Stripe/Lemon Squeezy)
- [ ] Database backed up
- [ ] Monitoring/alerting set up
- [ ] Custom domain configured (optional)
- [ ] SSL certificates validated
- [ ] Performance testing completed

Your PDF Learning SaaS should now be successfully deployed to Fly.io! 🚀
