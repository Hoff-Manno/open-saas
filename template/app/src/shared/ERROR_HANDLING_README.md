# Comprehensive Error Handling System

This document describes the comprehensive error handling and validation system implemented for the PDF Learning SaaS platform.

## Overview

The error handling system provides:
- **Consistent error responses** across all API endpoints
- **User-friendly error messages** with recovery options
- **Rate limiting** to prevent abuse
- **System monitoring** and health checks
- **Comprehensive validation** for all user inputs
- **Security measures** against malicious inputs

## Architecture

### Core Components

1. **Error Types** (`src/shared/errors.ts`)
   - Custom error classes for different error categories
   - Standardized error codes and messages
   - Recovery options for each error type

2. **Validation System** (`src/shared/validation.ts`)
   - Team membership and module access validation
   - Subscription limit enforcement
   - File validation with security checks

3. **Rate Limiting** (`src/shared/rateLimiting.ts`)
   - Configurable rate limits for different operations
   - Burst rate limiting for high-frequency operations
   - In-memory storage with Redis-ready interface

4. **Monitoring System** (`src/shared/monitoring.ts`)
   - Health checks for all system components
   - Metrics collection and alerting
   - Automated monitoring with configurable intervals

5. **Frontend Components** (`src/client/components/ErrorHandling.tsx`)
   - Error display components with recovery actions
   - Error boundary for React components
   - User-friendly error messages and guidance

## Error Categories

### Validation Errors
- `INVALID_FILE_TYPE` - Wrong file type uploaded
- `FILE_TOO_LARGE` - File exceeds size limits
- `INVALID_PDF_FORMAT` - Corrupted or invalid PDF
- `MISSING_REQUIRED_FIELD` - Required field not provided

### Processing Errors
- `PDF_PROCESSING_FAILED` - PDF processing failed
- `DOCLING_SERVICE_UNAVAILABLE` - Processing service down
- `OCR_PROCESSING_FAILED` - Text extraction failed
- `CONTENT_EXTRACTION_FAILED` - Content parsing failed

### Permission Errors
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `MODULE_ACCESS_DENIED` - No access to specific module
- `ORGANIZATION_ACCESS_DENIED` - No access to organization
- `ADMIN_REQUIRED` - Admin privileges required

### Subscription Errors
- `SUBSCRIPTION_REQUIRED` - Active subscription needed
- `MODULE_LIMIT_EXCEEDED` - Module creation limit reached
- `USER_LIMIT_EXCEEDED` - Team member limit reached
- `API_ACCESS_REQUIRED` - API access not available

### Rate Limiting Errors
- `PROCESSING_RATE_LIMIT` - Too many processing requests
- `API_RATE_LIMIT` - General API rate limit exceeded
- `UPLOAD_RATE_LIMIT` - File upload rate limit exceeded

### System Errors
- `DATABASE_ERROR` - Database operation failed
- `EXTERNAL_SERVICE_ERROR` - External service unavailable
- `STORAGE_ERROR` - File storage error
- `QUEUE_ERROR` - Background job queue error

## Usage Examples

### Backend Error Handling

```typescript
import { handleError, createHttpError, ErrorCode } from '../shared/errors';
import { validateModuleAccess } from '../shared/validation';
import { checkRateLimit } from '../shared/rateLimiting';

export const myOperation = async (args, context) => {
  try {
    // Rate limiting
    await checkRateLimit(context.user.id, 'MY_OPERATION');
    
    // Validation
    await validateModuleAccess(context.user.id, args.moduleId, context);
    
    // Business logic
    const result = await doSomething();
    
    return result;
  } catch (error) {
    throw handleError(error, 'myOperation');
  }
};
```

### Frontend Error Handling

```tsx
import { ErrorDisplay, useErrorHandler } from '../components/ErrorHandling';

function MyComponent() {
  const { error, handleError, clearError } = useErrorHandler();
  
  const handleSubmit = async () => {
    try {
      await myOperation();
    } catch (err) {
      handleError(err);
    }
  };
  
  return (
    <div>
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={handleSubmit}
          onDismiss={clearError}
        />
      )}
      {/* Rest of component */}
    </div>
  );
}
```

### Custom Validation

```typescript
import { validateFile } from '../shared/validation';

// Validate PDF file
validateFile(
  { name: 'document.pdf', type: 'application/pdf', size: 1024000 },
  {
    maxSizeBytes: 50 * 1024 * 1024,
    allowedTypes: ['application/pdf'],
    requirePDF: true,
  }
);
```

## Rate Limiting Configuration

### Default Limits

```typescript
export const RateLimits = {
  PDF_UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads per minute
  },
  PDF_PROCESSING: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 processing requests per 5 minutes
  },
  MODULE_CREATION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 module creations per minute
  },
  // ... more limits
};
```

### Custom Rate Limiting

```typescript
import { checkRateLimit } from '../shared/rateLimiting';

// Custom rate limit
await checkRateLimit(userId, 'CUSTOM_ACTION', {
  windowMs: 30 * 1000, // 30 seconds
  maxRequests: 10, // 10 requests per 30 seconds
});
```

## Monitoring and Health Checks

### System Health Dashboard

The system includes a comprehensive health dashboard accessible to administrators:

- **Service Status**: Database, PDF processing, storage, API server
- **System Metrics**: Performance metrics, queue status, user activity
- **Active Alerts**: Real-time alerts for system issues
- **Historical Data**: Metrics history and trend analysis

### Health Check Endpoints

```typescript
// Check overall system health
const health = await checkDoclingHealth();

// Individual service checks
const dbHealth = await healthChecker.checkDatabase(context);
const processingHealth = await healthChecker.checkPDFProcessing();
const storageHealth = await healthChecker.checkStorage();
```

### Automated Monitoring

```typescript
// Start automated monitoring
healthChecker.startMonitoring(context, 60000); // Check every minute
```

## Security Measures

### File Validation
- MIME type verification
- File size limits
- Filename sanitization
- Content validation for PDFs
- Malware scanning integration points

### Input Sanitization
- HTML sanitization
- SQL injection prevention
- Path traversal protection
- XSS prevention

### Access Control
- Role-based permissions
- Organization-level isolation
- Module access validation
- Admin privilege checks

## Recovery Options

Each error type includes specific recovery options:

### File Upload Errors
- Upload different file
- Compress file size
- View supported formats
- Contact support

### Subscription Errors
- Upgrade subscription
- Manage existing resources
- View pricing plans
- Start free trial

### Processing Errors
- Retry processing
- Check system status
- Contact support
- View troubleshooting guide

## Best Practices

### Error Handling
1. Always use `handleError()` for consistent error processing
2. Provide specific error codes for different scenarios
3. Include recovery options when possible
4. Log errors with sufficient context
5. Never expose sensitive information in error messages

### Validation
1. Validate at multiple layers (client, server, database)
2. Use schema validation for structured data
3. Sanitize all user inputs
4. Implement rate limiting for all public endpoints
5. Check permissions before processing

### Monitoring
1. Monitor all critical system components
2. Set up alerts for error thresholds
3. Track performance metrics
4. Implement health check endpoints
5. Use structured logging

## Configuration

### Environment Variables

```bash
# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
HEALTH_CHECK_INTERVAL_MS=60000
ALERT_THRESHOLD_ERROR_RATE=0.05

# File validation
MAX_FILE_SIZE_BYTES=52428800
ALLOWED_FILE_TYPES=application/pdf

# System limits
MAX_BATCH_SIZE=100
MAX_RETRY_ATTEMPTS=3
```

### Customization

The error handling system is designed to be easily customizable:

1. **Add new error codes** in `ErrorCode` enum
2. **Define error messages** in `ErrorMessages` object
3. **Create recovery actions** in `getRecoveryOptions()`
4. **Configure rate limits** in `RateLimits` object
5. **Add health checks** in `HealthChecker` class

## Testing

### Unit Tests
- Test all validation functions
- Test error handling scenarios
- Test rate limiting behavior
- Test recovery option generation

### Integration Tests
- Test end-to-end error flows
- Test system health checks
- Test monitoring and alerting
- Test error boundary components

### Load Tests
- Test rate limiting under load
- Test system behavior during failures
- Test recovery mechanisms
- Test monitoring accuracy

## Troubleshooting

### Common Issues

1. **Rate Limit False Positives**
   - Check system clock synchronization
   - Verify rate limit configuration
   - Clear rate limit cache if needed

2. **Health Check Failures**
   - Verify service connectivity
   - Check service dependencies
   - Review system resources

3. **Validation Errors**
   - Check input data format
   - Verify schema definitions
   - Review validation logic

### Debug Mode

Enable debug mode for detailed error information:

```typescript
// Set environment variable
DEBUG_ERRORS=true

// Or use debug flag
const error = handleError(originalError, 'operation', { debug: true });
```

## Future Enhancements

1. **Redis Integration** for distributed rate limiting
2. **Metrics Export** to external monitoring systems
3. **Advanced Alerting** with notification channels
4. **Error Analytics** and trend analysis
5. **Automated Recovery** for certain error types
6. **Circuit Breaker** pattern for external services
7. **Distributed Tracing** for error correlation
8. **Machine Learning** for anomaly detection

## Support

For questions or issues with the error handling system:

1. Check this documentation
2. Review error logs and monitoring dashboard
3. Test with debug mode enabled
4. Contact the development team
5. Create an issue in the project repository