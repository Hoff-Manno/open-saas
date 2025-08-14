// Comprehensive Error Handling System
import { HttpError } from 'wasp/server';

// Custom error types for better error categorization
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public code?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ProcessingError extends Error {
  constructor(message: string, public processingId?: string, public retryable: boolean = true) {
    super(message);
    this.name = 'ProcessingError';
  }
}

export class PermissionError extends Error {
  constructor(message: string, public requiredRole?: string, public action?: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class SubscriptionError extends Error {
  constructor(message: string, public requiredPlan?: string, public currentPlan?: string) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Error codes for consistent error handling
export enum ErrorCode {
  // Validation errors
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_PDF_FORMAT = 'INVALID_PDF_FORMAT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Processing errors
  PDF_PROCESSING_FAILED = 'PDF_PROCESSING_FAILED',
  DOCLING_SERVICE_UNAVAILABLE = 'DOCLING_SERVICE_UNAVAILABLE',
  OCR_PROCESSING_FAILED = 'OCR_PROCESSING_FAILED',
  CONTENT_EXTRACTION_FAILED = 'CONTENT_EXTRACTION_FAILED',
  
  // Permission errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  MODULE_ACCESS_DENIED = 'MODULE_ACCESS_DENIED',
  ORGANIZATION_ACCESS_DENIED = 'ORGANIZATION_ACCESS_DENIED',
  ADMIN_REQUIRED = 'ADMIN_REQUIRED',
  
  // Subscription errors
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  MODULE_LIMIT_EXCEEDED = 'MODULE_LIMIT_EXCEEDED',
  USER_LIMIT_EXCEEDED = 'USER_LIMIT_EXCEEDED',
  API_ACCESS_REQUIRED = 'API_ACCESS_REQUIRED',
  
  // Rate limiting errors
  PROCESSING_RATE_LIMIT = 'PROCESSING_RATE_LIMIT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  UPLOAD_RATE_LIMIT = 'UPLOAD_RATE_LIMIT',
  
  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  QUEUE_ERROR = 'QUEUE_ERROR',
}

// User-friendly error messages
export const ErrorMessages: Record<ErrorCode, string> = {
  // Validation errors
  [ErrorCode.INVALID_FILE_TYPE]: 'Please upload a valid PDF file.',
  [ErrorCode.FILE_TOO_LARGE]: 'File size exceeds the maximum limit. Please upload a smaller file.',
  [ErrorCode.INVALID_PDF_FORMAT]: 'The uploaded file is not a valid PDF or is corrupted.',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
  
  // Processing errors
  [ErrorCode.PDF_PROCESSING_FAILED]: 'Failed to process the PDF. Please try again or contact support.',
  [ErrorCode.DOCLING_SERVICE_UNAVAILABLE]: 'PDF processing service is temporarily unavailable. Please try again later.',
  [ErrorCode.OCR_PROCESSING_FAILED]: 'Failed to extract text from the PDF. The document may be corrupted or contain unsupported content.',
  [ErrorCode.CONTENT_EXTRACTION_FAILED]: 'Failed to extract content from the PDF. Please ensure the document is not password-protected.',
  
  // Permission errors
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
  [ErrorCode.MODULE_ACCESS_DENIED]: 'You do not have access to this learning module.',
  [ErrorCode.ORGANIZATION_ACCESS_DENIED]: 'You do not have access to this organization.',
  [ErrorCode.ADMIN_REQUIRED]: 'Administrator privileges are required for this action.',
  
  // Subscription errors
  [ErrorCode.SUBSCRIPTION_REQUIRED]: 'An active subscription is required to access this feature.',
  [ErrorCode.MODULE_LIMIT_EXCEEDED]: 'You have reached your module limit. Please upgrade your subscription to create more modules.',
  [ErrorCode.USER_LIMIT_EXCEEDED]: 'You have reached your team member limit. Please upgrade your subscription to add more users.',
  [ErrorCode.API_ACCESS_REQUIRED]: 'API access is only available for Enterprise subscribers. Please upgrade your subscription.',
  
  // Rate limiting errors
  [ErrorCode.PROCESSING_RATE_LIMIT]: 'You are processing files too quickly. Please wait before uploading another file.',
  [ErrorCode.API_RATE_LIMIT]: 'Too many requests. Please wait before trying again.',
  [ErrorCode.UPLOAD_RATE_LIMIT]: 'Upload rate limit exceeded. Please wait before uploading more files.',
  
  // System errors
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service is temporarily unavailable. Please try again later.',
  [ErrorCode.STORAGE_ERROR]: 'File storage error occurred. Please try again.',
  [ErrorCode.QUEUE_ERROR]: 'Processing queue error. Your request will be retried automatically.',
};

// Error response structure for consistent API responses
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    retryable?: boolean;
    retryAfter?: number;
  };
}

// Helper function to create standardized HTTP errors
export function createHttpError(
  statusCode: number,
  errorCode: ErrorCode,
  details?: any,
  retryable: boolean = false,
  retryAfter?: number
): HttpError {
  const message = ErrorMessages[errorCode];
  const errorData: ErrorResponse['error'] = {
    code: errorCode,
    message,
    retryable,
    ...(details && { details }),
    ...(retryAfter && { retryAfter }),
  };
  
  return new HttpError(statusCode, message, errorData);
}

// Helper function to handle and convert errors to HTTP errors
export function handleError(error: unknown, context?: string): HttpError {
  console.error(`Error in ${context || 'operation'}:`, error);
  
  if (error instanceof HttpError) {
    return error;
  }
  
  if (error instanceof ValidationError) {
    return createHttpError(400, ErrorCode.MISSING_REQUIRED_FIELD, { field: error.field });
  }
  
  if (error instanceof ProcessingError) {
    return createHttpError(
      500, 
      ErrorCode.PDF_PROCESSING_FAILED, 
      { processingId: error.processingId },
      error.retryable
    );
  }
  
  if (error instanceof PermissionError) {
    return createHttpError(403, ErrorCode.INSUFFICIENT_PERMISSIONS, {
      requiredRole: error.requiredRole,
      action: error.action,
    });
  }
  
  if (error instanceof SubscriptionError) {
    return createHttpError(402, ErrorCode.SUBSCRIPTION_REQUIRED, {
      requiredPlan: error.requiredPlan,
      currentPlan: error.currentPlan,
    });
  }
  
  if (error instanceof RateLimitError) {
    return createHttpError(429, ErrorCode.API_RATE_LIMIT, null, true, error.retryAfter);
  }
  
  // Default to internal server error
  return createHttpError(500, ErrorCode.DATABASE_ERROR);
}

// Recovery options for different error types
export interface RecoveryOption {
  action: string;
  label: string;
  url?: string;
  params?: Record<string, any>;
}

export function getRecoveryOptions(errorCode: ErrorCode): RecoveryOption[] {
  const recoveryMap: Partial<Record<ErrorCode, RecoveryOption[]>> = {
    [ErrorCode.INVALID_FILE_TYPE]: [
      { action: 'retry', label: 'Upload a different file' },
      { action: 'help', label: 'View supported file types', url: '/help/file-types' },
    ],
    [ErrorCode.FILE_TOO_LARGE]: [
      { action: 'retry', label: 'Upload a smaller file' },
      { action: 'compress', label: 'Learn how to compress PDFs', url: '/help/compress-pdf' },
    ],
    [ErrorCode.PDF_PROCESSING_FAILED]: [
      { action: 'retry', label: 'Try again' },
      { action: 'contact', label: 'Contact support', url: '/support' },
    ],
    [ErrorCode.MODULE_LIMIT_EXCEEDED]: [
      { action: 'upgrade', label: 'Upgrade subscription', url: '/pricing' },
      { action: 'manage', label: 'Delete unused modules', url: '/modules' },
    ],
    [ErrorCode.USER_LIMIT_EXCEEDED]: [
      { action: 'upgrade', label: 'Upgrade subscription', url: '/pricing' },
      { action: 'manage', label: 'Remove inactive users', url: '/team' },
    ],
    [ErrorCode.SUBSCRIPTION_REQUIRED]: [
      { action: 'subscribe', label: 'Choose a plan', url: '/pricing' },
      { action: 'trial', label: 'Start free trial', url: '/trial' },
    ],
  };
  
  return recoveryMap[errorCode] || [
    { action: 'retry', label: 'Try again' },
    { action: 'contact', label: 'Contact support', url: '/support' },
  ];
}