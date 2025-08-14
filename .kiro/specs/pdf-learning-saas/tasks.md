# Implementation Plan

- [x] 1. Set up database schema and core data models
  - Extend existing User entity with organization and role fields
  - Create new entities: Organization, LearningModule, ModuleSection, ModuleAssignment, UserProgress
  - Add enums for UserRole, ProcessingStatus, SubscriptionTier
  - Run database migration to apply schema changes
  - _Requirements: 1.1, 4.1, 6.1, 8.5_

- [x] 2. Adapt existing file upload system for PDFs
  - Modify existing FileUploadPage component to accept only PDF files
  - Update existing file validation to check for PDF type and reasonable size limits
  - Reuse existing S3 integration and presigned URL system with PDF-specific folder structure
  - Leverage existing upload progress and error handling from file-upload operations
  - _Requirements: 1.1, 1.6_

- [x] 3. Implement Docling Python library integration
  - Install docling Python package as dependency in package.json ✅
  - Create server-side PDF processing service using Docling DocumentConverter ✅
  - Configure OCR options (EasyOCR, Tesseract, RapidOCR) for scanned documents ✅
  - Implement background job processing using existing PgBoss job queue system ✅
  - Add processing status tracking and error handling for malformed PDFs ✅
  - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [x] 4. Extend existing OpenAI integration for learning features
  - Reuse existing OpenAI client and API key configuration from demo-ai-app
  - Use Docling's built-in VLM pipeline with SmolDocling model for image descriptions
  - Extend existing AI operations to generate comprehension questions from processed markdown content
  - Leverage Docling's formula and code enrichment features for technical documents
  - _Requirements: 1.4, 1.5_

- [x] 5. Create learning module management system
  - Build ModuleBuilder component for creating and editing learning modules
  - Implement content section management with drag-and-drop reordering
  - Create module preview and editing interface
  - Add module metadata management (title, description, estimated time)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Develop learning interface and progress tracking
  - Create responsive learning module viewer with section navigation ✅
  - Implement progress tracking with visual progress bars and completion status ✅
  - Build bookmark and resume functionality with position saving ✅
  - Add content search functionality within modules ✅
  - Create section completion checkpoints with user confirmation ✅
  - Implement Progress Dashboard with learning analytics ✅
  - Add comprehensive progress tracking operations ✅
  - Create reusable progress and search components ✅
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 7. Extend existing user management for team features
  - Adapt existing admin user management interface for team invitation and role assignment
  - Leverage existing User entity and isAdmin field, extend with new UserRole enum
  - Build module assignment system reusing existing user selection patterns
  - Use existing emailSender integration for assignment notifications
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 8. Extend existing analytics system for learning metrics
  - Extended DailyStats database model with learning-specific metrics fields ✅
  - Updated calculateDailyStats job to include learning completion rates and engagement metrics ✅
  - Created dedicated learning analytics operations (getLearningAnalytics, getUserEngagement) ✅
  - Built comprehensive learning analytics dashboard components with engagement tracking ✅
  - Added learning metrics to existing dashboard charts and tables with new UI components ✅
  - Created enhanced admin dashboard with tabbed interface for business and learning metrics ✅
  - Integrated with existing Plausible/Google Analytics patterns for usage tracking ✅
  - _Requirements: 4.3, 4.5, 7.1, 7.2, 7.3, 7.4_

- [x] 9. Leverage existing Google Auth for team access
  - Use existing Google OAuth integration already configured in OpenSaaS
  - Extend existing user signup flow to handle team organization assignment
  - Reuse existing social auth patterns for automatic account creation
  - No additional SSO configuration needed - existing Google auth handles team access
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 10. Adapt existing Stripe integration for new subscription tiers
  - Update existing Stripe products and pricing to match new tiers (Starter, Professional, Enterprise)
  - Reuse existing subscription status checking patterns for feature restrictions
  - Leverage existing customer portal and webhook handling for plan changes
  - Extend existing PricingPage component with new tier descriptions and limits
  - Use existing subscription enforcement patterns throughout the app
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 11. Extend existing admin dashboard for learning management
  - Add new tabs/sections to existing AdminDashboard component for learning modules
  - Reuse existing user management table patterns for progress monitoring
  - Extend existing admin layout and navigation with learning-specific sections
  - Leverage existing admin permission checks and UI components
  - Add learning metrics to existing dashboard widgets and charts
  - _Requirements: 7.5, 8.5_

- [x] 12. Transform demo AI app into PDF learning features
  - Replace demo-ai-app route and components with PDF upload and learning module interface
  - Reuse existing AI integration patterns and OpenAI client configuration
  - Update existing landing page content sections to focus on PDF learning benefits
  - Migrate existing AI operations structure for new Docling-based processing operations
  - No additional environment variables needed - Docling runs locally as Python library
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 13. Implement comprehensive error handling and validation
  - Add robust error handling for PDF processing failures
  - Implement user-friendly error messages and recovery options
  - Create validation for team membership and module access permissions
  - Add rate limiting and queue management for processing operations
  - Build monitoring and alerting for system health
  - _Requirements: 1.6, 4.1, 6.4_

- [x] 14. Create end-to-end tests for core workflows
  - Added Playwright tests covering core flows (see `template/e2e-tests/tests/`):
    - PDF-to-module creation workflow ✅
    - User assignment and progress tracking scenarios ✅
    - Team management and permission scenarios ✅
    - Subscription tier enforcement and billing integration ✅
    - AI service integrations with mock responses ✅
  - Included fixtures and utilities for repeatable setup ✅
  - README with local and CI run instructions included ✅
  - _Requirements: All requirements validation_

- [x] 15. Leverage existing infrastructure for performance optimization
  - Reuse existing S3 CDN patterns for processed content delivery ✅
  - Extend existing job queue system (PgBoss) for PDF processing background tasks ✅
  - Optimize new database queries using existing analytics query patterns ✅
  - Use existing deployment configuration - Docling runs as local Python library ✅
  - Leverage existing caching patterns from file upload and analytics systems ✅
  - Configure Docling model downloads for deployment environment ✅
  - _Requirements: Performance and scalability for all features_