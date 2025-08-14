### Open SaaS Webapp — Read-only Audit Report

Date: 2025-08-14

Sources referenced: `Docs.md`, `waspdocs.md`, steering docs: `template/app/deployment`, `template/app/ui-components`.

### Executive status

- Dev environment: template compiles conceptually with Wasp ^0.17.0; many features are wired, but several require env keys or production providers.
- Production readiness: not yet. Email sender uses Dummy provider, analytics/env placeholders exist, and PDF processing pipeline has a scheduling gap.
- Critical functional gap: PDF processing action does not enqueue the background job; processing appears stubbed and won’t complete end-to-end.

### Environment and framework

- Wasp version: `^0.17.0` (in `template/app/main.wasp`)
- Node.js requirement: `Docs.md` says >= 22.12; `waspdocs.md` says >= 20. Use >= 22.12 to align with project docs.
- Deployment: Steering doc `template/app/deployment` confirms Fly.io via `wasp deploy` flow; pre-deploy script present.

### Auth

- Config: `template/app/main.wasp`
  - Methods: `email` enabled with custom email content; `google` enabled; `github` and `discord` commented.
  - Redirects: `onAuthFailedRedirectTo: "/login"`, `onAuthSucceededRedirectTo: "/pdf-learning"`.
  - Hooks: `onAfterSignup`, `onBeforeOAuthRedirect` wired.
- Email sender: `emailSender.provider: Dummy` (dev-only). Per `Docs.md` and Wasp docs, must switch to SendGrid/Mailgun for prod builds.
- Admin bootstrap: `src/auth/userSignupFields.ts` uses `ADMIN_EMAILS` env to set `isAdmin` at signup; ensure it’s set.

Status: OK for dev; action required for production (switch provider, set envs).

### Payments

- Processor selection: `src/payment/paymentProcessor.ts` => Stripe is active; Lemon Squeezy available but disabled.
- Stripe client: `src/payment/stripe/stripeClient.ts` pins `apiVersion: '2025-04-30.basil'`.
  - Action: Ensure Stripe npm package version matches this API version and your Dashboard default; update one or the other as per `Docs.md` guidance.
- Webhook/API: `api paymentsWebhook` exposed at `POST /payments-webhook` in `main.wasp`; handler exports from `src/payment/webhook.ts`.
- Required envs (examples; see `Docs.md` Payments + Deploying):
  - Server: `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs (e.g., `PAYMENTS_*_PLAN_ID`), `STRIPE_CUSTOMER_PORTAL_URL`.
  - Client: if using GA for cookie consent, see Analytics section.

Status: Wiring present; action required to set env vars and verify API version alignment.

### Analytics

- Head scripts: `main.wasp` includes placeholder Plausible script tags; comments note GA requires cookie consent injection.
- Admin stats provider defaults to Plausible: `src/analytics/stats.ts` imports Plausible utils; Google import is commented.
- Env requirements if Plausible: `PLAUSIBLE_API_KEY`, `PLAUSIBLE_SITE_ID`, `PLAUSIBLE_BASE_URL` (`src/analytics/providers/plausibleAnalyticsUtils.ts`).
- Cookie consent for GA: `src/client/components/cookie-consent/Config.ts` expects `REACT_APP_GOOGLE_ANALYTICS_ID`.

Status: Action required to decide provider and set corresponding envs; remove placeholder `<your-site-id>` in `main.wasp` head if using Plausible.

### File uploads (S3)

- Presigned upload/download utilities: `src/file-upload/s3Utils.ts`, `pdfS3Utils.ts` use `AWS_S3_REGION`, `AWS_S3_IAM_ACCESS_KEY`, `AWS_S3_IAM_SECRET_KEY`, `AWS_S3_FILES_BUCKET`.
- CORS: `Docs.md` includes required S3 CORS config; ensure allowed origins include localhost and prod domain.

Status: Action required to set AWS envs and S3 CORS.

### PDF learning and processing (Docling pipeline)

- Actions/queries: `src/pdf-processing/operations.ts` implement `processPDF`, `getProcessingStatus`, etc.
  - Issue: `processPDF` validates and creates a `LearningModule` and logs start, but does not enqueue `processPDFJob`. Background processing is therefore not triggered.
- Job definition: `main.wasp` declares `job processPDFJob` with `perform: import { processPDFJob } ...`.
- Job implementation: `src/pdf-processing/jobs.ts` implements realistic flow with retries, but enqueuing is marked TODO.
- Docling service: `src/pdf-processing/doclingService.ts` shells out to Python `scripts/docling_processor.py`; requires Python and `docling` dependencies (`scripts/requirements.txt`).

Status: Action required to wire `processPDF` to enqueue `processPDFJob` and to provision Python/Docling deps in the runtime; otherwise feature is not functionally complete.

### Admin dashboard

- Routes/pages present (analytics, engagement, users, settings, UI catalog). Access gated via `isAdmin`.
- `dailyStatsJob` scheduled hourly; depends on analytics envs and payments to compute metrics.

Status: OK structurally; action required to supply analytics/payment envs for meaningful data.

### Database (Prisma)

- Schema: `template/app/schema.prisma` uses `String @id @default(uuid())` for entities; aligns across code.
- Entities include payments fields (`paymentProcessorUserId`, `subscriptionStatus`, `subscriptionPlan`), file uploads, learning module models.
- Migrations: not reviewed here; ensure `wasp db migrate-dev` has been run.

Status: OK; run migrations before app start.

### Security and DevOps

- Pre-deploy checks: `scripts/pre-deploy-check.sh` verifies tools and envs. Note it expects `SENDGRID_API_KEY` even if `emailSender` is `Dummy`.
  - Action: Either set a real email provider + key for prod, or adjust expectations when running pre-deploy in dev.
- Environment variables: ensure `.env.server` and `.env.client` exist (not tracked in repo). `Docs.md` lists comprehensive variables under Deploying.
- Shadcn UI: steering doc `template/app/ui-components` restricts to Shadcn v2.3.0; follow import fixups for new components.

Status: Action required to populate envs and align email provider before deployment.

### Landing/SEO and content

- `main.wasp` head contains placeholder SEO/meta and Plausible tags with example domain; update for your domain.
- Cookie consent modal in client is wired for GA if enabled; not needed for Plausible (per `Docs.md`).

Status: Action required to update head/meta and analytics script placeholders.

### Summary of required actions to be "fully functional"

1. Email
   - Switch `emailSender` to a production provider (e.g., SendGrid/Mailgun) and set credentials.
   - Update `from` email to match provider-configured sender.
2. Payments (Stripe)
   - Set `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, product/price IDs, and `STRIPE_CUSTOMER_PORTAL_URL`.
   - Align Stripe client API version with your Dashboard or adjust package version.
   - Verify webhook events list matches handler expectations.
3. Analytics
   - Choose Plausible or GA. Set required envs and remove placeholder script tags in `main.wasp`.
   - If GA, ensure cookie consent injects `REACT_APP_GOOGLE_ANALYTICS_ID` at build time.
4. File uploads (S3)
   - Set `AWS_S3_*` envs; configure S3 CORS.
5. PDF processing
   - Enqueue `processPDFJob` from `processPDF` (or other trigger) and implement scheduling/backoff.
   - Provision Python runtime and install `scripts/requirements.txt`; verify `docling` availability.
6. Admin
   - Set `ADMIN_EMAILS` to bootstrap admin accounts.
7. Deployment
   - Run `scripts/pre-deploy-check.sh`; resolve any failed checks.
   - Generate `fly-*.toml` via `wasp deploy fly launch` and set secrets per steering docs.

### Notes on references

- Setup, payments, analytics, S3, and deploy steps: see `Docs.md`.
- Wasp framework behavior and requirements: see `waspdocs.md`.
- Deployment specifics (Fly CLI flow) and UI component rules: see steering docs `template/app/deployment` and `template/app/ui-components`.


