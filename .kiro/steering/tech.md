# Technology Stack

## Core Framework
- **Wasp**: Full-stack React/Node.js framework with built-in auth, database, and deployment
- **React 18**: Frontend UI library with TypeScript support
- **Node.js**: Backend runtime environment
- **PostgreSQL**: Primary database with Prisma ORM

## Frontend Technologies
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **React Hook Form**: Form handling with Zod validation
- **Lucide React**: Icon library
- **React Hot Toast**: Notification system

## Backend & Database
- **Prisma**: Database ORM with migrations
- **PgBoss**: Job queue for background processing
- **Zod**: Runtime type validation

## Authentication & Payments
- **Wasp Auth**: Built-in authentication with email/password and social providers
- **Stripe**: Payment processing and subscription management
- **Lemon Squeezy**: Alternative payment processor

## File Storage & AI
- **AWS S3**: File storage with presigned URLs
- **OpenAI**: GPT integration for content generation
- **Mozilla AI Docling**: PDF-to-markdown conversion (planned)

## Analytics & Monitoring
- **Plausible Analytics**: Privacy-friendly web analytics
- **Custom Analytics**: Built-in user and revenue tracking

## Testing & Documentation
- **Playwright**: End-to-end testing framework
- **Astro + Starlight**: Documentation and blog platform

## Common Commands

### Development
```bash
# Start the main app (client + server)
cd template/app && wasp start

# Start database only
cd template/app && wasp start db

# Run database migrations
cd template/app && wasp db migrate-dev

# Seed database with mock data
cd template/app && wasp db seed

# Start blog/docs
cd template/blog && npm run dev
```

### Database Management
```bash
# Open Prisma Studio (database GUI)
cd template/app && wasp db studio

# Reset database (WARNING: deletes all data)
cd template/app && wasp db reset

# Create new migration after schema changes
cd template/app && wasp db migrate-dev
```

### Testing
```bash
# Run e2e tests
cd template/e2e-tests && npm run e2e:playwright

# Run e2e tests with UI
cd template/e2e-tests && npm run local:e2e:playwright:ui

# Start local e2e testing with Stripe webhook
cd template/e2e-tests && npm run local:e2e:start
```

### Payment Testing (Stripe)
```bash
# Login to Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/payments-webhook

# Trigger test payment events
stripe trigger payment_intent.succeeded
```

### Deployment
```bash
# Build for production
cd template/app && wasp build

# Deploy to Fly.io (one command deploy)
cd template/app && wasp deploy fly launch

# Set environment variables on deployed app
wasp deploy fly cmd --context server secrets set KEY=value
```

## Environment Variables

### Server-side (.env.server)
```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-key
WASP_WEB_CLIENT_URL=http://localhost:3000
WASP_SERVER_URL=http://localhost:3001

# OpenAI
OPENAI_API_KEY=sk-...

# Email Sending
SENDGRID_API_KEY=SG...
# or
MAILGUN_API_KEY=key-...
MAILGUN_DOMAIN=mg.yourdomain.com

# Payment Processing (choose one)
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CUSTOMER_PORTAL_URL=https://billing.stripe.com/...
# or
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_WEBHOOK_SECRET=...

# AWS S3 File Storage
AWS_S3_IAM_ACCESS_KEY_ID=AKIA...
AWS_S3_IAM_SECRET_ACCESS_KEY=...
AWS_S3_FILES_BUCKET=your-bucket-name
AWS_S3_REGION=us-west-2

# Analytics
PLAUSIBLE_API_KEY=...
PLAUSIBLE_SITE_ID=yourdomain.com
GOOGLE_ANALYTICS_CLIENT_EMAIL=...
GOOGLE_ANALYTICS_PROPERTY_ID=...
GOOGLE_ANALYTICS_PRIVATE_KEY=... # base64 encoded

# Social Auth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Admin Setup
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### Client-side (.env.client)
```bash
# Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=G-...
REACT_APP_PLAUSIBLE_ANALYTICS_ID=yourdomain.com
```

### Important Notes
- Use `.env.server.example` and `.env.client.example` as templates
- Never commit actual API keys to version control
- For production, set environment variables on your hosting platform
- Client-side variables must be prefixed with `REACT_APP_`