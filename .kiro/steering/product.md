# Product Overview

## OpenSaaS Template

This is the OpenSaaS template - a fully open-source, production-ready SaaS boilerplate built with modern web technologies. The template is completely free to use and distribute, comes with extensive features out of the box, and is community-driven and constantly improving.

### Template Features Out of the Box
- Full-stack authentication (email verified + social auth)
- Subscription payments with Stripe or Lemon Squeezy
- Admin dashboard with analytics
- File uploads to AWS S3
- Email sending capabilities
- Background jobs and cron scheduling
- End-to-end type safety
- One-command deployment
- Blog/documentation with Astro Starlight
- End-to-end testing with Playwright
- Cookie consent modal for GDPR compliance

### Built on Powerful Tools
- **Wasp** - Full-stack React, NodeJS, Prisma framework with superpowers
- **Astro Starlight** - Lightweight template for documentation and blog
- **Stripe/Lemon Squeezy** - Payment processing
- **Plausible/Google Analytics** - Analytics
- **OpenAI** - AI integration
- **AWS S3** - File storage
- **SendGrid/MailGun** - Email sending
- **TailwindCSS** - Styling with TailAdmin components

## Current Project: PDF Learning SaaS

The current implementation is building a PDF-to-Learning Module SaaS platform that transforms static PDF documents into interactive, trackable learning modules for B2B teams.

### Core Value Proposition
"Turn your PDFs into interactive learning experiences in minutes, not months. Track engagement, measure comprehension, and scale your training effortlessly."

### Key Features
- PDF processing with Mozilla AI's Docling for superior document-to-markdown conversion
- Auto-generation of structured learning modules from PDF content
- Team management with role-based access (admin/learner)
- Progress tracking and analytics
- Module assignment and completion tracking
- Multi-tier subscription model (Starter/Professional/Enterprise)

### Target Market
- Mid-market companies (50-500 employees) with training/onboarding needs
- Educational institutions, consulting firms, professional services
- Use cases: Employee onboarding, compliance training, product documentation, sales enablement

### User Roles & Permissions
- **Admin Users**: Access to admin dashboard, user management, analytics
- **Regular Users**: Access to main app features based on subscription status
- **Subscription Tiers**: Hobby, Pro, and Credits-based plans
- **Subscription Statuses**: active, past_due, cancel_at_period_end, deleted