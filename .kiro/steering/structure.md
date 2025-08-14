# Project Structure

## Repository Organization

This is a multi-project repository containing:

### `/template/` - Main OpenSaaS Template
The core SaaS application template that serves as the foundation for new projects.

### `/opensaas-sh/` - Demo & Documentation Site
The opensaas.sh website showcasing the template, built using the template itself (inception!).

### `/document-to-markdown-main/` - PDF Processing Library
Mozilla AI's Docling library for converting PDFs to markdown (submodule/reference).

## Main Application Structure (`/template/app/`)

### Core Configuration
- `main.wasp` - Wasp framework configuration defining routes, pages, entities, and operations
- `schema.prisma` - Database schema with all entities and relationships
- `package.json` - Dependencies and scripts
- `tailwind.config.cjs` - Tailwind CSS configuration

### Source Code Organization (`/src/`)

#### Authentication (`/src/auth/`)
- `LoginPage.tsx`, `SignupPage.tsx` - Auth UI components
- `email-and-pass/` - Email authentication logic
- `userSignupFields.ts` - User registration field definitions

#### Client-Side (`/src/client/`)
- `App.tsx` - Root application component
- `Main.css` - Global styles
- `components/` - Shared UI components
- `hooks/` - Custom React hooks
- `icons/` - Icon components

#### Feature Modules
Each major feature has its own directory with operations, UI, and types:

- `/src/demo-ai-app/` - AI demo functionality (to be replaced with PDF processing)
- `/src/file-upload/` - File handling with S3 integration
- `/src/payment/` - Stripe/LemonSqueezy payment processing
- `/src/user/` - User management and account pages
- `/src/analytics/` - Usage analytics and reporting
- `/src/admin/` - Admin dashboard and management tools
- `/src/landing-page/` - Marketing landing page components

#### Shared Code
- `/src/shared/` - Common utilities and types
- `/src/lib/` - Utility functions
- `/src/components/ui/` - Reusable UI components (shadcn/ui style)

#### Server-Side (`/src/server/`)
- `scripts/` - Database seeds and maintenance scripts
- `utils.ts` - Server utilities
- `validation.ts` - Server-side validation schemas

## Supporting Projects

### Blog/Documentation (`/template/blog/`)
- Astro-based documentation site with Starlight theme
- `/src/content/docs/` - Documentation content
- `/src/components/` - Custom Astro components

### E2E Tests (`/template/e2e-tests/`)
- Playwright test suite
- `/tests/` - Test specifications
- `playwright.config.ts` - Test configuration

## File Naming Conventions

### Components
- PascalCase for React components: `UserDropdown.tsx`
- Descriptive names indicating purpose: `LandingPage.tsx`, `PricingPage.tsx`

### Operations
- `operations.ts` - Server-side business logic for each feature
- Exported functions use camelCase: `createTask`, `getAllTasksByUser`

### Database
- PascalCase for Prisma models: `User`, `LearningModule`, `ModuleSection`
- camelCase for fields: `createdAt`, `subscriptionStatus`
- Descriptive relation names: `createdModules`, `assignedModules`

## Key Patterns

### Wasp Entity-Operation Pattern
Each feature follows this structure:
1. Define entities in `schema.prisma`
2. Create operations in `src/[feature]/operations.ts`
3. Define queries/actions in `main.wasp`
4. Build UI components that use the operations

### File Upload Pattern
- Upload to S3 with presigned URLs
- Store metadata in database
- Generate download URLs on demand

### Authentication Flow
- Wasp handles auth automatically
- Pages can be marked `authRequired: true`
- User context available via `useAuth()` hook

### Payment Integration
- Support for both Stripe and LemonSqueezy
- Webhook handling for subscription updates
- User subscription status stored in database

## Development Workflow

### Making Changes
1. **Schema Changes**: Update `schema.prisma` → run `wasp db migrate-dev`
2. **New Features**: Create feature directory → add operations → update `main.wasp`
3. **UI Components**: Use existing component library in `/src/components/ui/`
4. **Testing**: Add Playwright tests for new user flows

### Key Development Practices
- Always run `wasp db migrate-dev` after schema changes
- Use `wasp db studio` to inspect database during development
- Check server logs for email verification links in development
- Test payment flows with Stripe CLI webhook forwarding
- Use `wasp start db` in separate terminal for database
- Environment variables go in `.env.server` and `.env.client`

### Customization Checklist
- [ ] Update app name and title in `main.wasp`
- [ ] Change meta tags in `app.head`
- [ ] Update favicon and banner images in `public/`
- [ ] Customize landing page content in `contentSections.ts`
- [ ] Set up payment processor (Stripe or Lemon Squeezy)
- [ ] Configure email sender (SendGrid, Mailgun, or SMTP)
- [ ] Set up analytics (Plausible or Google Analytics)
- [ ] Configure social auth providers if needed
- [ ] Remove unused features and dependencies
- [ ] Update admin emails in environment variables

### Deployment Preparation
- [ ] Switch from Dummy email provider to production provider
- [ ] Get production API keys for all services
- [ ] Set up production webhooks for payments
- [ ] Configure CORS for AWS S3 with production domain
- [ ] Set up social auth redirect URLs for production
- [ ] Test all features in production environment